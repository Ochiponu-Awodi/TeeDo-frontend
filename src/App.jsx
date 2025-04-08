import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { io } from 'socket.io-client';
import { FaSun, FaMoon } from 'react-icons/fa';
import TodoList from './TodoList';
import './input.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [swipingId, setSwipingId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  const baseURL = import.meta.env.VITE_API_URL || 'https://teedo-backend.onrender.com';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const api = useMemo(() => axios.create({ baseURL, headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token, baseURL]);

  const fetchTodos = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setMessage('');
    try {
      const response = await api.get('/todos');
      setTodos(response.data);
      localStorage.setItem('todos', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching todos:', error);
      if (error.response?.status === 401) {
        setToken('');
        localStorage.removeItem('token');
        setTodos([]);
        setMessage('Session expired, please log in again');
      } else {
        setMessage('Failed to fetch todos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (token) fetchTodos();
    else setTodos(JSON.parse(localStorage.getItem('todos')) || []);
  }, [token, fetchTodos]);

  useEffect(() => {
    if (!token) return;
    const socket = io(baseURL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('WebSocket connected'));
    socket.on('new_todo', (todo) => {
      setTodos(prev => {
        if (prev.some(t => t.id === todo.id)) return prev;
        const updated = [...prev, todo];
        localStorage.setItem('todos', JSON.stringify(updated));
        setMessage('New todo added in real-time');
        setTimeout(() => setMessage(''), 2000);
        return updated;
      });
    });
    socket.on('updated_todo', (todo) => {
      setTodos(prev => {
        const updated = prev.map(t => (t.id === todo.id ? todo : t));
        localStorage.setItem('todos', JSON.stringify(updated));
        setMessage('Todo updated in real-time');
        setTimeout(() => setMessage(''), 2000);
        return updated;
      });
    });
    socket.on('deleted_todo', ({ id }) => {
      setTodos(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('todos', JSON.stringify(updated));
        setMessage('Todo deleted in real-time');
        setTimeout(() => setMessage(''), 2000);
        return updated;
      });
    });
    return () => socket.disconnect();
  }, [token, baseURL]);

  const register = async () => {
    setMessage('');
    try {
      const response = await axios.post(`${baseURL}/register`, { username, password });
      setMessage(response.data.message);
      setUsername('');
      setPassword('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      setMessage(errorMsg === 'Username already exists' ? 'Username taken' : errorMsg);
    }
  };

  const login = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${baseURL}/login`, { username, password });
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setMessage('Logged in successfully');
      setUsername('');
      setPassword('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed';
      setMessage(errorMsg === 'Invalid username or password' ? 'Wrong credentials' : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setTodos([]);
    setMessage('Logged out');
    setTimeout(() => setMessage(''), 2000);
  };

  const addTodo = useCallback(() => {
    if (!newTask.trim()) return;
    const debouncedAdd = debounce(async () => {
      setIsLoading(true);
      setMessage('');
      try {
        await api.post('/todos', { task: newTask });
        setNewTask('');
        setMessage('Todo added successfully');
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        console.error('Error adding todo:', error);
        setMessage('Failed to add todo');
      } finally {
        setIsLoading(false);
      }
    }, 300);
    debouncedAdd();
  }, [api, newTask]);

  const toggleTodo = async (id, completed) => {
    try {
      await api.put(`/todos/${id}`, { completed: !completed });
      setTodos(prev => {
        const updated = prev.map(t => (t.id === id ? { ...t, completed: !completed } : t));
        localStorage.setItem('todos', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error toggling todo:', error);
      setMessage('Failed to toggle todo');
      fetchTodos();
    }
  };

  const deleteTodo = async (id) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('todos', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
      setMessage('Failed to delete todo');
      fetchTodos();
    }
  };

  const updateOrder = (newTodos) => {
    setTodos(newTodos);
    localStorage.setItem('todos', JSON.stringify(newTodos));
    // TODO: Sync order to backend
  };

  return (
    <div className="App">
      {!token ? (
        <div className="relative flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl">Todo App</h1>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <div className="flex space-x-2">
            <button onClick={register}>Register</button>
            <button onClick={login}>Login</button>
          </div>
          {isLoading && (
            <div className="fixed inset-0 flex items-center justify-center loading-overlay">
              <div className="loader"></div>
            </div>
          )}
          {message && <p>{message}</p>}
        </div>
      ) : (
        <div className="relative flex flex-col items-center">
          <div className="w-full mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl">Todo List</h1>
            <button className="theme-toggle mt-2" onClick={toggleTheme}>
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="absolute top-0 right-0" onClick={logout}>Logout</button>
          </div>
          <div className="w-full flex items-center space-x-2">
            <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a new task" />
            <button onClick={addTodo}>Add</button>
          </div>
          <TodoList
            todos={todos}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            swipingId={swipingId}
            setSwipingId={setSwipingId}
            updateOrder={updateOrder}
          />
          {isLoading && (
            <div className="fixed inset-0 flex items-center justify-center loading-overlay">
              <div className="loader"></div>
            </div>
          )}
          {message && <p>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
