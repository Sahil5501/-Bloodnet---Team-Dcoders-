import React, { useState, useEffect } from 'react';

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

// --- STYLES ---
// All styles are included here to prevent import issues.
const AppStyles = () => (
  <style>{`
    /* --- GLOBAL STYLES & VARIABLES --- */
    :root {
      --primary-color: #dc2626;
      --primary-hover: #b91c1c;
      --background-color: #f9fafb;
      --card-background: #ffffff;
      --text-dark: #1f2937;
      --text-medium: #4b5563;
      --text-light: #6b7280;
      --border-color: #e5e7eb;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --font-family: 'Inter', sans-serif;
    }

    body {
      margin: 0;
      font-family: var(--font-family);
      background-color: var(--background-color);
      color: var(--text-dark);
    }

    .app-wrapper {
      min-height: 100vh;
    }

    /* --- ICONS --- */
    .icon { height: 1.5rem; width: 1.5rem; }
    .portal-icon { height: 3rem; width: 3rem; color: var(--primary-color); }
    .portal-arrow-icon { height: 1.5rem; width: 1.5rem; margin-left: 0.5rem; }

    /* --- BUTTONS --- */
    .button {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: background-color 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .button-primary { background-color: var(--primary-color); color: white; }
    .button-primary:hover { background-color: var(--primary-hover); }
    .button-full { width: 100%; padding-top: 0.75rem; padding-bottom: 0.75rem; }

    /* --- NAVBAR --- */
    .navbar {
      background-color: var(--card-background);
      box-shadow: var(--shadow);
      position: sticky; top: 0; z-index: 10;
    }
    .navbar-container {
      max-width: 80rem; margin: 0 auto; padding: 0 1.5rem;
      display: flex; align-items: center; justify-content: space-between; height: 4rem;
    }
    .navbar-brand { display: flex; align-items: center; color: var(--primary-color); }
    .brand-name { font-weight: bold; font-size: 1.25rem; margin-left: 0.5rem; }
    .navbar-links { display: flex; gap: 1rem; }
    .nav-button {
      background: none; border: none; color: var(--text-dark); padding: 0.5rem 0.75rem;
      border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500;
      cursor: pointer; transition: background-color 0.2s, color 0.2s;
    }
    .nav-button:hover { background-color: var(--primary-color); color: white; }

    /* --- PAGE & HEADER --- */
    .page-container { padding: 2rem; max-width: 80rem; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.875rem; font-weight: bold; color: var(--text-dark); margin: 0; }
    .page-header p { color: var(--text-medium); margin-top: 0.25rem; }

    /* --- FILTER SECTION --- */
    .filter-section { margin-bottom: 1.5rem; }
    .filter-section h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-dark); }
    .filter-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .filter-button {
      padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
      border-radius: 9999px; transition: all 0.2s ease; cursor: pointer;
      background-color: var(--card-background); color: var(--text-dark); border: 1px solid var(--border-color);
    }
    .filter-button:hover { background-color: #f3f4f6; }
    .filter-button.active {
      background-color: var(--primary-color); color: white;
      border-color: var(--primary-color); box-shadow: var(--shadow);
    }

    /* --- REQUESTS GRID & CARD --- */
    .requests-grid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 1.5rem; }
    @media (min-width: 768px) { .requests-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .requests-grid { grid-template-columns: repeat(3, 1fr); } }

    .request-card {
      background-color: var(--card-background); border-radius: 0.5rem; box-shadow: var(--shadow);
      overflow: hidden; transition: transform 0.3s ease; border-left: 4px solid;
    }
    .request-card:hover { transform: translateY(-4px); }
    .card-content { padding: 1rem; }
    .card-header { display: flex; align-items: center; justify-content: space-between; }
    .blood-type-icon {
      background-color: var(--primary-color); color: white; font-weight: bold;
      border-radius: 50%; height: 3rem; width: 3rem; display: flex;
      align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;
    }
    .header-text { margin-left: 1rem; flex-grow: 1; }
    .header-text h3 { font-size: 1.125rem; font-weight: bold; margin: 0; }
    .header-text p { font-size: 0.875rem; color: var(--text-medium); margin: 0; }
    .urgency-badge { padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; color: white; }
    .card-details {
      margin-top: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between;
      align-items: center; font-size: 0.875rem; color: var(--text-dark);
    }
    .card-details p { margin: 0; }
    .card-details span { font-weight: 600; color: var(--primary-color); }

    /* Urgency Colors */
    .urgency-badge.urgency-high { background-color: #ef4444; }
    .urgency-badge.urgency-medium { background-color: #f59e0b; }
    .urgency-badge.urgency-low { background-color: #10b981; }
    .request-card.urgency-high { border-left-color: #ef4444; }
    .request-card.urgency-medium { border-left-color: #f59e0b; }
    .request-card.urgency-low { border-left-color: #10b981; }

    /* --- FORM STYLES --- */
    .form-container { max-width: 42rem; }
    .form-card {
      background-color: var(--card-background); padding: 2rem; border-radius: 0.5rem;
      box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 1.5rem;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: var(--text-dark); }
    .form-group input, .form-group select {
      padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.375rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-size: 1rem;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3);
    }

    /* --- AUTH & PORTAL PAGES --- */
    .auth-container, .portal-container {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .auth-card, .portal-card {
      max-width: 28rem; width: 100%; background-color: var(--card-background);
      padding: 2rem; border-radius: 0.75rem; box-shadow: var(--shadow);
    }
    .auth-header, .portal-header { text-align: center; margin-bottom: 1.5rem; }
    .auth-header h2, .portal-header h1 { font-size: 1.875rem; font-weight: 800; margin: 0; }
    .auth-header p, .portal-header p { margin-top: 0.5rem; color: var(--text-medium); }
    .auth-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .auth-toggle { text-align: center; margin-top: 1.5rem; }
    .auth-toggle button { background: none; border: none; color: var(--primary-color); font-weight: bold; cursor: pointer; }
    .portal-actions { display: flex; flex-direction: column; gap: 1rem; }
    .portal-button {
      display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem;
      font-size: 1.1rem; font-weight: 600; border: none; border-radius: 8px;
      cursor: pointer; transition: all 0.2s ease-in-out; text-align: left;
    }
    .portal-button:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
    .portal-button.donor { background-color: var(--primary-color); color: white; }
    .portal-button.admin { background-color: #f3f4f6; color: var(--text-dark); }
    
    /* --- MODAL STYLES --- */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5);
      display: flex; align-items: center; justify-content: center; z-index: 20;
    }
    .modal-content {
      background-color: var(--card-background); padding: 2rem; border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      max-width: 28rem; width: 90%; text-align: center;
    }
    .modal-content h2 { font-size: 1.5rem; font-weight: 600; margin-top: 0; }
    .modal-content p { color: var(--text-medium); margin-bottom: 1.5rem; }
    .modal-actions { display: flex; gap: 1rem; justify-content: center; }

    /* --- OTHER STYLES --- */
    .card-actions { display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center; }
    .button-donated { background-color: #16a34a; color: white; cursor: not-allowed; flex-grow: 1; }
    .button-undo { background-color: var(--text-light); color: var(--text-dark); padding: 0.5rem 1rem; }
    .button-undo:hover { background-color: var(--text-medium); color: white; }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%;
      border-top: 4px solid #fff; width: 20px; height: 20px;
      animation: spin 1s linear infinite; margin: 0 auto;
    }
    .auth-container .spinner { border-top-color: var(--primary-color); }
    .button .spinner { border-top-color: white; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .notification {
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        padding: 1rem 1.5rem; border-radius: 0.375rem; color: white;
        box-shadow: var(--shadow); z-index: 1001; background-color: #16a34a;
    }
    .notification.error { background-color: var(--primary-color); }
  `}</style>
);

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

// --- SHARED ICONS & COMPONENTS ---
const BloodDropIcon = ({ className = "icon" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
  </svg>
);
const ArrowRightIcon = ({ className = "portal-arrow-icon" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);
const Notification = ({ message, type = 'success' }) => {
    if (!message) return null;
    const notificationClass = type === 'error' ? 'notification error' : 'notification';
    return <div className={notificationClass}>{message}</div>;
};

// =================================================================================================
// --- DONOR COMPONENT ---
// =================================================================================================
const Donor = () => {
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

    const handleLogout = async () => { await signOut(auth); };
    const handleOpenModal = (request) => { setSelectedRequest(request); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedRequest(null); };

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

    const renderPage = () => {
        if (page === 'loading') return <div className="auth-container"><div className="spinner"></div></div>;
        if (page === 'dashboard') return <DonorDashboard requests={requests} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />;
        return <AuthPage showNotification={showNotification} userType="Donor" />;
    };

    return (
        <div className="app-wrapper">
            {user && <DonorNavbar handleLogout={handleLogout} />}
            <main>{renderPage()}</main>
            {isModalOpen && <DonorModal onConfirm={handleDonate} onCancel={handleCloseModal} isLoading={isLoading} />}
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

// --- Donor Sub-Components ---
const DonorNavbar = ({ handleLogout }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand"><BloodDropIcon /><span className="brand-name">BloodNet Donor</span></div>
            <button onClick={handleLogout} className="button button-primary">Logout</button>
        </div>
    </nav>
);
const DonorModal = ({ onConfirm, onCancel, isLoading }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2>Confirm Donation</h2>
            <p>Are you sure you want to proceed? This will notify the hospital.</p>
            <div className="modal-actions">
                <button onClick={onCancel} className="button button-undo" disabled={isLoading}>Cancel</button>
                <button onClick={onConfirm} className="button button-primary" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : "Yes, I'll Donate"}
                </button>
            </div>
        </div>
    </div>
);
const DonorRequestCard = ({ request, handleOpenModal, handleUndo }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';
    return (
        <div className={`request-card ${urgencyClass}`}>
            <div className="card-content">
                <div className="card-header">
                    <div className="blood-type-icon">{request.bloodType}</div>
                    <div className="header-text">
                        <h3>{request.hospital}</h3>
                        <p>For: {request.patientName}</p>
                    </div>
                    <span className={`urgency-badge ${urgencyClass}`}>{request.urgency}</span>
                </div>
                <div className="card-details">
                    <p>Units Required:</p>
                    <span>{request.units}</span>
                </div>
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
const DonorDashboard = ({ requests, handleOpenModal, handleUndo }) => {
    const [bloodTypeFilter, setBloodTypeFilter] = useState('All');
    const [urgencyFilter, setUrgencyFilter] = useState('All');
    const bloodTypes = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const urgencies = ['All', 'High', 'Medium', 'Low'];
    const filteredRequests = requests.filter(request => {
        const bloodTypeMatch = bloodTypeFilter === 'All' || request.bloodType === bloodTypeFilter;
        const urgencyMatch = urgencyFilter === 'All' || request.urgency === urgencyFilter;
        return bloodTypeMatch && urgencyMatch;
    });
    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Active Requests</h1>
                <p>Find verified, nearby blood requests and save a life.</p>
            </header>
            <div className="filter-section">
                <h2>Filter by Blood Type</h2>
                <div className="filter-buttons">
                    {bloodTypes.map(type => (<button key={type} onClick={() => setBloodTypeFilter(type)} className={`filter-button ${bloodTypeFilter === type ? 'active' : ''}`}>{type}</button>))}
                </div>
            </div>
            <div className="filter-section">
                <h2>Filter by Urgency</h2>
                <div className="filter-buttons">
                    {urgencies.map(level => (<button key={level} onClick={() => setUrgencyFilter(level)} className={`filter-button ${urgencyFilter === level ? 'active' : ''}`}>{level}</button>))}
                </div>
            </div>
            <div className="requests-grid">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(request => <DonorRequestCard key={request.id} request={request} handleOpenModal={handleOpenModal} handleUndo={handleUndo} />)
                ) : (
                    <p>No active requests for the selected filters.</p>
                )}
            </div>
        </div>
    );
};

// =================================================================================================
// --- ADMIN COMPONENT ---
// =================================================================================================
const Admin = () => {
    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [notification, setNotification] = useState({ message: '', type: 'success' });

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

    const handleLogout = async () => { await signOut(auth); };

    const renderPage = () => {
        if (page === 'loading') return <div className="auth-container"><div className="spinner"></div></div>;
        switch (page) {
            case 'dashboard': return <AdminDashboard requests={requests} />;
            case 'createRequest': return <CreateRequestPage setPage={setPage} showNotification={showNotification} />;
            default: return <AuthPage showNotification={showNotification} userType="Admin" />;
        }
    };

    return (
        <div className="app-wrapper">
            {user && <AdminNavbar setPage={setPage} handleLogout={handleLogout} />}
            <main>{renderPage()}</main>
            <Notification message={notification.message} type={notification.type} />
        </div>
    );
};

// --- Admin Sub-Components ---
const AdminNavbar = ({ setPage, handleLogout }) => (
    <nav className="navbar">
        <div className="navbar-container">
            <div className="navbar-brand"><BloodDropIcon /><span className="brand-name">BloodNet Admin</span></div>
            <div className="navbar-links">
                <button onClick={() => setPage('dashboard')} className="nav-button">Dashboard</button>
                <button onClick={() => setPage('createRequest')} className="nav-button">Create Request</button>
            </div>
            <button onClick={handleLogout} className="button button-primary">Logout</button>
        </div>
    </nav>
);
const AdminRequestCard = ({ request }) => {
    const urgencyClass = `urgency-${request.urgency.toLowerCase()}`;
    const isDonated = request.status === 'Donated';
    return (
        <div className={`request-card ${urgencyClass}`}>
            <div className="card-content">
                <div className="card-header">
                    <div className="blood-type-icon">{request.bloodType}</div>
                    <div className="header-text">
                        <h3>{request.hospital}</h3>
                        <p>For: {request.patientName}</p>
                    </div>
                    <span className={`urgency-badge ${urgencyClass}`}>{request.urgency}</span>
                </div>
                <div className="card-details">
                    <p>Units Required:</p>
                    <span>{request.units}</span>
                </div>
                <div className="card-actions">
                    <div className={`button ${isDonated ? 'button-donated' : 'button-primary'}`}>
                        {isDonated ? 'Fulfilled' : 'Pending'}
                    </div>
                </div>
            </div>
        </div>
    );
};
const AdminDashboard = ({ requests }) => (
    <div className="page-container">
        <header className="page-header">
            <h1>Admin Dashboard</h1>
            <p>Monitor all active and fulfilled blood requests.</p>
        </header>
        <div className="requests-grid">
            {requests.map(request => <AdminRequestCard key={request.id} request={request} />)}
        </div>
    </div>
);
const CreateRequestPage = ({ setPage, showNotification }) => {
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        const newRequest = {
            patientName: formData.get('patientName'), hospital: formData.get('hospital'),
            bloodType: formData.get('bloodType'), units: parseInt(formData.get('units'), 10),
            urgency: formData.get('urgency'), status: 'Active', createdAt: serverTimestamp()
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
            <header className="page-header"><h1>Create a Blood Request</h1></header>
            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-group">
                    <label htmlFor="patientName">Patient's Name</label>
                    <input type="text" id="patientName" name="patientName" required />
                </div>
                <div className="form-group">
                    <label htmlFor="hospital">Hospital/Clinic Name</label>
                    <input type="text" id="hospital" name="hospital" required />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="bloodType">Blood Type</label>
                        <select id="bloodType" name="bloodType" required>
                            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                            <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="units">Units Required</label>
                        <input type="number" id="units" name="units" min="1" required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="urgency">Urgency</label>
                    <select id="urgency" name="urgency" required>
                        <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                </div>
                <button type="submit" className="button button-primary button-full" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : 'Submit Request'}
                </button>
            </form>
        </div>
    );
};

// =================================================================================================
// --- SHARED AUTH COMPONENT ---
// =================================================================================================
const AuthPage = ({ showNotification, userType }) => {
    const [authMode, setAuthMode] = useState('login');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const email = e.target.email.value;
        const password = e.target.password.value;
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
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>{userType} Portal</h2>
                    <p>{authMode === 'login' ? `Sign in to continue` : `Create an account`}</p>
                </div>
                <form onSubmit={handleAuth} className="auth-form">
                    <div className="form-group">
                        <input name="email" type="email" required placeholder="Your Email Address" />
                    </div>
                    <div className="form-group">
                        <input name="password" type="password" required placeholder="Password" />
                    </div>
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
};

// =================================================================================================
// --- MAIN APP COMPONENT (PORTAL) ---
// =================================================================================================
export default function App() {
  const [appMode, setAppMode] = useState('portal'); // 'portal', 'donor', or 'admin'

  const renderContent = () => {
    switch (appMode) {
      case 'donor':
        return <Donor />;
      case 'admin':
        return <Admin />;
      case 'portal':
      default:
        return (
          <div className="portal-container">
            <div className="portal-card">
              <div className="portal-header">
                <BloodDropIcon className="portal-icon" />
                <h1>Welcome to BloodNet</h1>
                <p>Connecting donors with those in need. Please select your role to continue.</p>
              </div>
              <div className="portal-actions">
                <button onClick={() => setAppMode('donor')} className="portal-button donor">
                  <span>I am a Donor</span>
                  <ArrowRightIcon />
                </button>
                <button onClick={() => setAppMode('admin')} className="portal-button admin">
                  <span>I am an Admin</span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <AppStyles />
      {renderContent()}
    </>
  );
}
