import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { debounce } from 'lodash'
import { io } from 'socket.io-client'
import { useSwipeable } from 'react-swipeable';
import { FaSun, FaMoon } from 'react-icons/fa';
import './input.css'

function App() {
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('todos')) || []);
  const [newTask, setNewTask] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [swipingId, setSwipingId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  // Dynamic baseurl for all requests
  const baseURL = import.meta.env.VITE_API_URL || 'https://teedo-backend.onrender.com';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Axios instance for authenticated requests
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
        setMessage('Session expired. Please log in again.');
      } else {
        setMessage('Failed to fetch todos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, token]);

  // Initial fetch on login
  useEffect(() => { if (token) fetchTodos(); else { setTodos([]); localStorage.removeItem('todos'); } }, [token, fetchTodos]);

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io(baseURL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => console.log('WebSocket connected'));
    socket.on('new_todo', (todo) => {
      if (token) { // Only update if logged in
        setTodos((prevTodos) => {
          if (prevTodos.some(t => t.id === todo.id)) return prevTodos;
          const updatedTodos = [...prevTodos, todo];
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          setMessage('New todo added in real-time');
          setTimeout(() => setMessage(''), 2000);
          return updatedTodos;
        });
      }
    });
    socket.on('updated_todo', (todo) => {
      if (token) {
        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.map(t => (t.id === todo.id ? todo : t));
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          setMessage('Todo updated in real-time');
          setTimeout(() => setMessage(''), 2000);
          return updatedTodos;
        });
      }
    });
    socket.on('deleted_todo', ({ id }) => {
      if (token) {
        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.filter(t => t.id !== id);
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          setMessage('Todo deleted in real-time');
          setTimeout(() => setMessage(''), 2000);
          return updatedTodos;
        });
      }
    });
    return () => socket.disconnect(); // Cleanup on unmount
  }, [token, baseURL])

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
    const debouncedAdd = debounce(async () => {
      if (!newTask) return;
      setIsLoading(true);
      setMessage('');
      try {
        const response = await api.post('/todos', { task: newTask});
        setTodos((prevTodos) => {
          // Only add if not already present
          if (prevTodos.some(t => t.id === response.data.id)) return prevTodos;
          const updatedTodos = [...prevTodos, response.data];
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          return updatedTodos;
        });
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
    setIsLoading(true);
    setMessage('');
    try {
      const response = await api.put(`/todos/${id}`, { completed: !completed });
      setTodos((prevTodos) => {
        const updatedTodos = prevTodos.map(todo => (todo.id === id ? response.data : todo));
        localStorage.setItem('todos', JSON.stringify(updatedTodos));
        return updatedTodos;
      });
      setMessage('Todo updated successfully');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error updating todo:', error);
      setMessage('Failed to update todo');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTodo = async (id) => {
    setIsLoading(true);
    setMessage('');
    try {
      await api.delete(`/todos/${id}`);
      setTodos((prevTodos) => {
        const updatedTodos = prevTodos.filter(todo => todo.id !== id);
        localStorage.setItem('todos', JSON.stringify(updatedTodos));
        return updatedTodos;
      });
      setMessage('Todo deleted successfully');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error deleting todo:', error);
      setMessage('Failed to delete todo');
    } finally {
      setIsLoading(false);
      setSwipingId(null);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const id = Number(eventData.event.target.closest('li')?.dataset.id);
      if (id) deleteTodo(id);
    },
    onSwipeStart: (eventData) => {
      const id = Number(eventData.event.target.closest('li')?.dataset.id);
      if (id) setSwipingId(id);
    },
    onSwiped: () => setSwipingId(null),
    trackMouse: true,
    delta: 50,
  });

  return (
    <div className="App">
      {!token ? (
        <div className='relative'>
          <h1 className='text-2xl md:text-3xl lg:text-4xl'>TeeDo</h1>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

          <button onClick={register}>Register</button>
          <button onClick={login}>Login</button>

          {isLoading && (
            <div className="fixed inset-0 flex items-center justify-center loading-overlay">
              <div className="loader"></div>
            </div>
          )}
          {message && <p>{message}</p>}
        </div>
      ) : (
        <div className='relative'>
          <h1 className="text-2xl md:text-3xl lg:text-4xl">TeeDo List</h1>
          <button className="absolute top-0 left-10" onClick={toggleTheme}> {isDarkMode ? <FaSun /> : <FaMoon />} </button>
          <button className="absolute top-0 right-0" onClick={logout}>Logout</button>
          <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a new task" />

          <button onClick={addTodo}>Add Todo</button>
          <ul {...swipeHandlers}>
            {todos.map(todo => (
              <li key={todo.id} data-id={todo.id} className={swipingId === todo.id ? 'transform -translate-x-full transition-transform duration-300' : ''}>
                <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id, todo.completed)}/>
                <span className={todo.completed ? 'line-through' : ''}> {todo.task} </span>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
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

export default App
