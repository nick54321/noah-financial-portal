import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [entitlements, setEntitlements] = useState({ usd: false, eur: false, combo: false });
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('noah_token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user details if token exists
  const fetchCurrentUser = async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      setEntitlements({ usd: false, eur: false, combo: false });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setEntitlements(data.entitlements);
        setActiveSubscriptions(data.activeSubscriptions);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser(token);
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('noah_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchCurrentUser(data.token);
    return data;
  };

  const register = async (email, password, full_name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('noah_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchCurrentUser(data.token);
    return data;
  };

  // Connect MetaMask Wallet Flow
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask wallet extension not detected. Please install MetaMask or use In-App Privy wallet.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const walletAddress = accounts[0];

    // Request Nonce from Server
    const nonceRes = await fetch(`/api/auth/wallet-nonce?address=${walletAddress}`);
    const nonceData = await nonceRes.json();

    const signer = await provider.getSigner();
    const signature = await signer.signMessage(nonceData.nonce);

    if (user && token) {
      // Link wallet to authenticated user account
      const linkRes = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          wallet_type: 'metamask',
          signature,
          nonce: nonceData.nonce,
        }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error || 'Linking wallet failed');
      await fetchCurrentUser(token);
      return linkData;
    } else {
      // Login with MetaMask wallet
      const loginRes = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          signature,
          nonce: nonceData.nonce,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || 'Wallet login failed');

      localStorage.setItem('noah_token', loginData.token);
      setToken(loginData.token);
      setUser(loginData.user);
      await fetchCurrentUser(loginData.token);
      return loginData;
    }
  };

  // Connect In-App Privy Wallet
  const connectPrivy = async (privyWalletAddress) => {
    const walletAddress = privyWalletAddress || `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    if (user && token) {
      const linkRes = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          wallet_type: 'privy',
        }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error || 'Privy wallet linking failed');
      await fetchCurrentUser(token);
      return linkData;
    }
  };

  const logout = () => {
    localStorage.removeItem('noah_token');
    setToken(null);
    setUser(null);
    setEntitlements({ usd: false, eur: false, combo: false });
    setActiveSubscriptions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        entitlements,
        activeSubscriptions,
        token,
        loading,
        login,
        register,
        connectMetaMask,
        connectPrivy,
        logout,
        refreshUser: () => fetchCurrentUser(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
