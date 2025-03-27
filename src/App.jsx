import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [todos, setTodos] = useState([]);
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
      setMessage('');
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

  useEffect(() => {
    if (token) {
      fetchTodos();
    }
  }, [token, fetchTodos]);

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
  };

  const addTodo = async () => {
    if (!newTask) return;
    setIsLoading(true);
    setMessage('');
    try {
      const response = await api.post('/todos', { task: newTask});
      setTodos([...todos, response.data]);
      setNewTask('');
      setMessage('');
    } catch (error) {
      console.error('Error adding todo:', error);
      setMessage('Failed to add todo');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = async (id, completed) => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await api.put(`/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
      setMessage('');
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
      setTodos(todos.filter(todo => todo.id !== id));
      setMessage('');
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
          {isLoading && <p>Loading...</p>}
          {message && <p>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default App
