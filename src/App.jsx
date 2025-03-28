import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { debounce } from 'lodash'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem('todos')) || []);
  const [newTask, setNewTask] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic baseurl for all requests
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Axios instance for authenticated requests
  const api = useMemo(() => {
    return axios.create({
      baseURL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token, baseURL]);

  const fetchTodos = useCallback(async () => {
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
  }, [api]);

  // Initial fetch on login
  useEffect(() => {
    if (token) {
      setTimeout(() => fetchTodos(), 1000);
    }
  }, [token, fetchTodos]);

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io(baseURL);
    socket.on('new_todo', (todo) => {
      if (token) { // Only update if logged in
        setTodos((prevTodos) => {
          // Skip if todo already exists by checking the ID
          if (prevTodos.some(t => t.id === todo.id)) {
            return prevTodos; // No change
          }
          const updatedTodos = [...prevTodos, todo];
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          return updatedTodos;
        });
        setMessage('New todo added in real-time');
        setTimeout(() => setMessage(''), 2000);
      }
    });
    socket.on('updated_todo', (todo) => {
      if (token) {
        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.map(t => (t.id === todo.id ? todo : t));
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          return updatedTodos;
        });
        setMessage('Todo updated in real-time');
        setTimeout(() => setMessage(''), 2000);
      }
    });
    socket.on('deleted_todo', ({ id }) => {
      if (token) {
        setTodos((prevTodos) => {
          const updatedTodos = prevTodos.filter(t => t.id !== id);
          localStorage.setItem('todos', JSON.stringify(updatedTodos));
          return updatedTodos;
        });
        setMessage('Todo deleted in real-time');
        setTimeout(() => setMessage(''), 2000);
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
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setTodos([]);
    setMessage('Logged out');
    setTimeout(() => setMessage(''), 2000);
  };

  const addTodo = useCallback(
    debounce(async () => {
    if (!newTask) return;
    setIsLoading(true);
    setMessage('');
    try {
      const response = await api.post('/todos', { task: newTask});
      setTodos((prevTodos) => {
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
  }, 300),
  [api, newTask]
);

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
    }
  };

  return (
    <div className="App">
      {!token ? (
        <div>
          <h1>Todo App</h1>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button onClick={register}>Register</button>
          <button onClick={login}>Login</button>
          {message && <p>{message}</p>}
        </div>
      ) : (
        <div>
          <h1>Todo List</h1>
          <button onClick={logout}>Logout</button>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task"
          />
          <button onClick={addTodo}>Add Todo</button>
          <ul>
            {todos.map(todo => (
              <li key={todo.id}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                  {todo.task}
                </span>
                <button onClick={() => deleteTodo(todo.id)}>Delete</button>
              </li>
            ))}
          </ul>
          {isLoading && <p className='loading'>Loading...</p>}
          {message && <p>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default App
