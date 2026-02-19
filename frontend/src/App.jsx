import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/App.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import GlobalPlayer from '@/components/GlobalPlayer';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import BeatDetails from '@/pages/BeatDetails';
import ProducerProfile from '@/pages/ProducerProfile';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Orders from '@/pages/Orders';
import ProducerDashboard from '@/pages/producer/ProducerDashboard';
import UploadBeat from '@/pages/producer/UploadBeat';
import useAuthStore from '@/store/authStore';

const ProtectedRoute = ({ children, requireProducer = false }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireProducer && user?.role !== 'PRODUCER' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/beats/:id" element={<BeatDetails />} />
          <Route path="/producer/:id" element={<ProducerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          
          {/* Producer Routes */}
          <Route
            path="/producer"
            element={
              <ProtectedRoute requireProducer>
                <ProducerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/producer/upload"
            element={
              <ProtectedRoute requireProducer>
                <UploadBeat />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
        <GlobalPlayer />
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}

export default App;
