import React, { useState, useEffect } from 'react';
import './App.css'; 

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAvsNQxfSO-f_CveCtB6NwRPI6HJ_nFgwU",
  authDomain: "bloodnet-48b07.firebaseapp.com",
  projectId: "bloodnet-48b07",
  storageBucket: "bloodnet-48b07.appspot.com",
  messagingSenderId: "491047752084",
  appId: "1:491047752084:web:0d75b02133df4cac6abf81",
  measurementId: "G-95ZE4E8REG"
};

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- ICONS ---
const BloodDropIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
  </svg>
);


// --- REUSABLE COMPONENTS ---

const Notification = ({ message, type = 'success' }) => {
    if (!message) return null;
    const notificationClass = type === 'error' ? 'notification error' : 'notification';
    return <div className={notificationClass}>{message}</div>;
};

const Modal = ({ onConfirm, onCancel, isLoading }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm Donation</h2>
        <p>Are you sure you want to proceed?</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="button button-undo" disabled={isLoading}>Cancel</button>
          <button onClick={onConfirm} className="button button-primary" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : "Yes, I'll Donate"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ setPage, handleLogout }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand"><BloodDropIcon /><span className="brand-name">BloodNet</span></div>
            <div className="navbar-links">
                <button onClick={() => setPage('dashboard')} className="nav-button">Dashboard</button>
                <button onClick={() => setPage('createRequest')} className="nav-button">Create Request</button>
                <button onClick={() => setPage('profile')} className="nav-button">Profile</button>
            </div>
            <button onClick={handleLogout} className="button button-primary">Logout</button>
        </div>
    </nav>
);

const RequestCard = ({ request, handleOpenModal, handleUndo }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';

    return (
        <div className={`request-card ${urgencyClass}`}>
            <div className="card-content">
                <div className="card-header">
                    <div className="blood-type-icon">{request.bloodType}</div>
                    <div className="header-text"><h3>{request.hospital}</h3><p>For: {request.patientName}</p></div>
                    <span className={`urgency-badge ${urgencyClass}`}>{request.urgency} Urgency</span>
                </div>
                <div className="card-details"><p>Units Required: <span>{request.units}</span></p></div>
                <div className="card-actions">
                    <button className={`button ${isDonated ? 'button-donated' : 'button-primary'}`} onClick={() => !isDonated && handleOpenModal(request)} disabled={isDonated}>
                        {isDonated ? 'Donation Confirmed!' : 'I can donate'}
                    </button>
                    {isDonated && (<button onClick={() => handleUndo(request.id)} className="button button-undo">Undo</button>)}
                </div>
            </div>
        </div>
    );
};


// --- PAGE COMPONENTS ---

const DashboardPage = ({ requests, handleOpenModal, handleUndo }) => {
  const [bloodTypeFilter, setBloodTypeFilter] = useState('All');
  const bloodTypes = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return (
    <div className="page-container">
      <header className="page-header"><h1>Active Requests</h1><p>Find verified, nearby blood requests and save a life.</p></header>
      <div className="filter-section">
        <h2>Filter by Blood Type</h2>
        <div className="filter-buttons">
          {bloodTypes.map(type => (<button key={type} onClick={() => setBloodTypeFilter(type)} className={`filter-button ${bloodTypeFilter === type ? 'active' : ''}`}>{type}</button>))}
        </div>
      </div>
      <div className="requests-grid">
        {requests.map(request => <RequestCard key={request.id} request={request} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />)}
      </div>
    </div>
  );
};

const CreateRequestPage = ({ setPage, showNotification }) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.target);
    const newRequest = { 
        patientName: formData.get('patientName'), 
        hospital: formData.get('hospital'), 
        bloodType: formData.get('bloodType'), 
        units: parseInt(formData.get('units'), 10), 
        urgency: formData.get('urgency'), 
        status: 'Active',
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, "requests"), newRequest);
        showNotification('Request created successfully!');
        setPage('dashboard');
    } catch (error) {
        showNotification('Error creating request.', 'error');
    } finally {
        setIsLoading(false);
    }
  };
  return (
    <div className="page-container form-container">
      <h1 className="page-header">Create a Blood Request</h1>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group"><label htmlFor="patientName">Patient's Name</label><input type="text" id="patientName" name="patientName" required /></div>
        <div className="form-group"><label htmlFor="hospital">Hospital/Clinic Name</label><input type="text" id="hospital" name="hospital" required /></div>
        <div className="form-row">
          <div className="form-group"><label htmlFor="bloodType">Blood Type</label><select id="bloodType" name="bloodType" required><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
          <div className="form-group"><label htmlFor="units">Units Required</label><input type="number" id="units" name="units" min="1" required /></div>
        </div>
        <div className="form-group"><label htmlFor="urgency">Urgency</label><select id="urgency" name="urgency" required><option>High</option><option>Medium</option><option>Low</option></select></div>
        <button type="submit" className="button button-primary button-full" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

const AuthPage = ({ showNotification }) => {
    const [authMode, setAuthMode] = useState('login');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            if (authMode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
                showNotification('Registration successful! Please sign in.');
                setAuthMode('login'); 
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            let friendlyMessage = "An error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') friendlyMessage = "This email is already registered. Please sign in.";
            else if (error.code === 'auth/weak-password') friendlyMessage = "Password should be at least 6 characters long.";
            else if (error.code === 'auth/invalid-credential') friendlyMessage = "Invalid email or password.";
            showNotification(friendlyMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome to BloodNet</h2>
                    <p>{authMode === 'login' ? 'Sign in to continue' : 'Create an account to become a donor'}</p>
                </div>
                <form onSubmit={handleAuth} className="auth-form">
                    <div className="form-group"><input id="email" name="email" type="email" required placeholder="Your Email Address" /></div>
                    <div className="form-group"><input id="password" name="password" type="password" required placeholder={authMode === 'login' ? 'Password' : 'Create a Password (min. 6 characters)'} /></div>
                    <button type="submit" className="button button-primary button-full" disabled={isLoading}>
                        {isLoading ? <div className="spinner"></div> : (authMode === 'login' ? 'Sign In' : 'Register')}
                    </button>
                </form>
                <div className="auth-toggle">
                    {authMode === 'login' ? (
                        <>Don't have an account? <button onClick={() => setAuthMode('register')}>Register</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => setAuthMode('login')}>Sign In</button></>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setPage(currentUser ? 'dashboard' : 'auth');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setRequests(requestsData);
    });
    return () => unsubscribe();
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: 'success' }), 4000);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleDonate = async () => {
    if (!user || !selectedRequest) return;
    setIsLoading(true);
    try {
        const requestRef = doc(db, "requests", selectedRequest.id);
        await updateDoc(requestRef, { status: 'Donated' });
        showNotification('Success! Donation status updated.');
    } catch (error) {
        showNotification('Error: Could not complete donation.', 'error');
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleUndo = async (requestId) => {
    const requestRef = doc(db, "requests", requestId);
    await updateDoc(requestRef, { status: 'Active' });
    showNotification('Donation status reverted.');
  };

  const handleOpenModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const renderPage = () => {
    if (page === 'loading') {
        return <div className="auth-container"><div className="spinner"></div></div>;
    }
    switch (page) {
      case 'dashboard':
        return <DashboardPage requests={requests} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />;
      case 'createRequest':
        return <CreateRequestPage setPage={setPage} showNotification={showNotification} />;
      case 'profile':
        return <div className="page-container"><h1 className="page-header">User Profile Page</h1><p>Welcome, {user?.email}</p></div>;
      case 'auth':
        return <AuthPage showNotification={showNotification} />;
      default:
        return <AuthPage showNotification={showNotification} />;
    }
  };

  return (
    <div className="app-wrapper">
      {user && <Navbar setPage={setPage} handleLogout={handleLogout} />}
      <main>
        {renderPage()}
      </main>
      {isModalOpen && <Modal onConfirm={handleDonate} onCancel={handleCloseModal} isLoading={isLoading} />}
      <Notification message={notification.message} type={notification.type} />
    </div>
  );
}

