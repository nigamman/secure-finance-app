import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc
} from "./firebase";
import { onSnapshot } from "firebase/firestore";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  TextField,
  Avatar,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel
} from "@mui/material";

function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [users, setUsers] = useState([]);
  const [sendAmount, setSendAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestRecipient, setRequestRecipient] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [moneyRequests, setMoneyRequests] = useState([]);

  const splitBill = async () => {
    if (!billAmount || isNaN(billAmount) || Number(billAmount) <= 0) {
      alert("Please enter a valid bill amount.");
      return;
    }
    if (selectedUsers.length === 0) {
      alert("Please select at least one user to split the bill.");
      return;
    }

    const totalPeople = selectedUsers.length + 1; // Including the user
    const splitAmount = (Number(billAmount) / totalPeople).toFixed(2);

    // Deduct amount from current user
    const newUserBalance = balance - splitAmount;
    if (newUserBalance < 0) {
      alert("You don't have enough balance to split the bill.");
      return;
    }
    await updateDoc(doc(db, "users", user.email), { balance: newUserBalance });
    setBalance(newUserBalance);

    // Update each selected user
    for (const email of selectedUsers) {
      const userRef = doc(db, "users", email);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userBalance = userDoc.data().balance || 0;
        await updateDoc(userRef, { balance: userBalance + Number(splitAmount) });

        // Save transaction for each user
        await addDoc(collection(db, "transactions"), {
          type: "Bill Split",
          amount: splitAmount,
          sender: user.email,
          recipient: email,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ✅ Generate Payment Link and Save it to State
    const paymentUrl = `https://secure-pay.com/pay?amount=${splitAmount}&users=${selectedUsers.join(",")}`;
    setPaymentLink(paymentUrl);

    alert(`Bill of $${billAmount} split among ${totalPeople} people. Each pays $${splitAmount}`);
    setBillAmount("");
    setSelectedUsers([]);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map((doc) => ({
        email: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (user) {
      const requestRef = collection(db, "moneyRequests");

      const unsubscribe = onSnapshot(requestRef, (snapshot) => {
        const requests = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((req) => req.recipient === user.email || req.sender === user.email); // Show only relevant requests

        setMoneyRequests(requests);
      });

      return () => unsubscribe(); // Cleanup the listener when user logs out
    }
  }, [user]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.email));
        if (userDoc.exists()) {
          setBalance(userDoc.data().balance);
        } else {
          await setDoc(doc(db, "users", user.email), { name: user.displayName, balance: 1000 }, { merge: true });
          setBalance(1000);
        }
      }
    };
    fetchBalance();
  }, [user]);

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(collection(db, "transactions"), (snapshot) => {
        const txnList = snapshot.docs
          .map((doc) => doc.data())
          .filter((txn) => txn.sender === user.email || txn.recipient === user.email);
        setTransactions(txnList);
      });
      return () => unsubscribe();
    }
  }, [user]);


  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setBalance(0);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const sendMoney = async () => {
    if (!recipientEmail || !sendAmount || isNaN(sendAmount) || Number(sendAmount) <= 0) {
      alert("Please select a recipient and enter a valid amount.");
      return;
    }

    const newBalance = balance - Number(sendAmount);
    if (newBalance < 0) {
      alert("Insufficient balance!");
      return;
    }

    const recipientRef = doc(db, "users", recipientEmail);
    const recipientDoc = await getDoc(recipientRef);

    if (!recipientDoc.exists()) {
      alert("Recipient not found!");
      return;
    }

    await updateDoc(doc(db, "users", user.email), { balance: newBalance });
    setBalance(newBalance);

    const recipientBalance = recipientDoc.data().balance;
    await updateDoc(recipientRef, { balance: recipientBalance + Number(sendAmount) });

    await addDoc(collection(db, "transactions"), {
      type: "Sent",
      amount: sendAmount,
      sender: user.email,
      recipient: recipientEmail,
      timestamp: new Date().toISOString(),
    });

    alert(`$${sendAmount} sent to ${recipientEmail}`);
    setSendAmount("");
    setRecipientEmail("");
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 5 }}>
      <Typography variant="h3" color="primary">Secure Finance App 💰</Typography>

      {!user ? (
        <Button variant="contained" color="primary" onClick={handleLogin} sx={{ mt: 3 }}>
          Sign in with Google
        </Button>
      ) : (
        <>
          <Card sx={{ mt: 4, p: 3, textAlign: "center", boxShadow: 3 }}>
            <CardContent>
              <Avatar src={user.photoURL} alt="User" sx={{ width: 80, height: 80, mx: "auto" }} />
              <Typography variant="h5" sx={{ mt: 2 }}>{user.displayName}</Typography>
              <Typography variant="body1" color="textSecondary">{user.email}</Typography>
              <Typography variant="h4" color="success.main" sx={{ mt: 2 }}>Balance: ${balance}</Typography>
            </CardContent>
          </Card>

          {/* Send Money Section */}
          <Card sx={{ mt: 4, p: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Send Money</Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select a user</InputLabel>
                <Select value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}>
                  <MenuItem value="">-- Select a user --</MenuItem>
                  {users.map((u) => u.email !== user.email && (
                    <MenuItem key={u.email} value={u.email}>{u.name} ({u.email})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth label="Enter amount" type="number"
                value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                sx={{ mt: 2 }}
              />
              <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={sendMoney}>
                Send Money
              </Button>
            </CardContent>
          </Card>

          {/* Split Bill Section */}
          <Card sx={{ mt: 4, p: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Split a Bill</Typography>
              <TextField fullWidth label="Total Bill Amount" type="number"
                value={billAmount} onChange={(e) => setBillAmount(e.target.value)}
                sx={{ mt: 2 }}
              />
              {users.map((u) => u.email !== user.email && (
                <FormControlLabel
                  key={u.email}
                  control={<Checkbox onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, u.email]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(email => email !== u.email));
                    }
                  }} />}
                  label={`${u.name} (${u.email})`}
                />
              ))}
              <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={splitBill}>
                Split Bill
              </Button>
              {paymentLink && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Payment Link:{" "}
                  <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                    {paymentLink}
                  </a>
                </Typography>
              )}

            </CardContent>
          </Card>

          {/* Request Money Section */}
          <Card sx={{ mt: 4, p: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Request Money</Typography>

              {/* Amount Input */}
              <TextField
                fullWidth
                label="Enter amount"
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                sx={{ mt: 2 }}
              />

              {/* Select Recipient */}
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select a user</InputLabel>
                <Select value={requestRecipient} onChange={(e) => setRequestRecipient(e.target.value)}>
                  <MenuItem value="">-- Select a user --</MenuItem>
                  {users.map((u) =>
                    u.email !== user.email && (
                      <MenuItem key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>

              {/* Due Date Input */}
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 2 }}
              />

              {/* Request Money Button */}
              <Button
                variant="contained"
                color="warning"
                fullWidth
                sx={{ mt: 3 }}
                onClick={() => {
                  if (!requestRecipient || !requestAmount || !dueDate) {
                    alert("Please fill in all fields.");
                    return;
                  }

                  const requestData = {
                    sender: user.email,
                    recipient: requestRecipient,
                    amount: requestAmount,
                    dueDate,
                    status: "Pending",
                    timestamp: new Date().toISOString(),
                  };

                  addDoc(collection(db, "moneyRequests"), requestData)
                    .then(() => {
                      alert(`Money request of $${requestAmount} sent to ${requestRecipient} (Due: ${dueDate})`);
                      setRequestAmount("");
                      setRequestRecipient("");
                      setDueDate("");
                    })
                    .catch((error) => console.error("Request Money Error:", error));
                }}
              >
                Request Money
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 4, p: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Pending Money Requests</Typography>

              {moneyRequests.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  No pending requests.
                </Typography>
              ) : (
                <ul style={{ padding: 0 }}>
                  {moneyRequests.map((req) => (
                    <li key={req.id} style={{
                      listStyle: "none",
                      padding: "8px",
                      borderBottom: "1px solid #ddd"
                    }}>
                      {req.sender === user.email
                        ? `You requested $${req.amount} from ${req.recipient} (Due: ${req.dueDate})`
                        : `${req.sender} requested $${req.amount} from you (Due: ${req.dueDate})`}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Transaction History Section */}
          <Card sx={{ mt: 4, p: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Transaction History</Typography>
              {transactions.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  No transactions yet.
                </Typography>
              ) : (
                <ul style={{ padding: 0 }}>
                  {transactions.map((txn, index) => (
                    <li key={index} style={{
                      listStyle: "none",
                      padding: "8px",
                      borderBottom: "1px solid #ddd",
                      color: txn.sender === user.email ? "red" : "green"
                    }}>
                      {txn.sender === user.email
                        ? `Sent $${txn.amount} to ${txn.recipient}`
                        : `Received $${txn.amount} from ${txn.sender}`}
                      <Typography variant="caption" display="block" color="textSecondary">
                        {new Date(txn.timestamp).toLocaleString()}
                      </Typography>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>



          {/* Logout Button */}
          <Button variant="contained" color="error" sx={{ mt: 4 }} onClick={handleLogout}>
            Logout
          </Button>
        </>
      )}
    </Container>
  );
}

export default App;
