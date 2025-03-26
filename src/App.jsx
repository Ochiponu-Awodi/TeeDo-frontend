import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');

  // Axios instance with token
  const api = axios.create({
    baseURL:  import.meta.env.VITE_API_URL || 'http://localhost:5000',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const fetchTodos = useCallback(async () => {
    try {
      const response = await api.get('/todos');
      setTodos(response.data);
    } catch (error) {
      console.error('Error fetching todos:', error);
      setMessage('Failed to fetch todos');
    }
  }, [api, setTodos, setMessage]);

  useEffect(() => {
    if (token) {
      fetchTodos();
    }
  }, [token, fetchTodos]);

  const register = async () => {
    try {
      const response = await axios.post('http://localhost:5000/register', { username, password });
      setMessage(response.data.message);
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Registration failed');
    }
  };

  const login = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setMessage('Login successfully');
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Login failed');
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
    try {
      const response = await api.post('/todos', { task: newTask});
      setTodos([...todos, response.data]);
      setNewTask('');
    } catch (error) {
      console.error('Error adding todo:', error);
      setMessage('Failed to add todo');
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      const response = await api.put(`/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
    } catch (error) {
      console.error('Error updating todo:', error);
      setMessage('Failed to update todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      setMessage('Failed to delete todo');
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
          {message && <p>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default App
