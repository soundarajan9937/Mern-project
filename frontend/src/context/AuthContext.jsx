import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  student: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        user: action.payload.user,
        student: action.payload.student || null,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'LOADING_DONE':
      return { ...state, loading: false };
    case 'UPDATE_STUDENT':
      return { ...state, student: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'LOADING_DONE' });
        return;
      }
      try {
        const res = await authAPI.getMe();
        dispatch({
          type: 'SET_AUTH',
          payload: {
            user: res.data.user,
            student: res.data.student,
            token,
          },
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOADING_DONE' });
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
    const { token, user, student } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'SET_AUTH', payload: { user, student, token } });
    return { user, student };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateStudent = useCallback((student) => {
    dispatch({ type: 'UPDATE_STUDENT', payload: student });
  }, []);

  const updateUser = useCallback((updatedUser, updatedStudent) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({
      type: 'SET_AUTH',
      payload: {
        user: updatedUser,
        student: updatedStudent !== undefined ? updatedStudent : state.student,
        token: state.token || localStorage.getItem('token'),
      },
    });
  }, [state.token, state.student]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateStudent, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
