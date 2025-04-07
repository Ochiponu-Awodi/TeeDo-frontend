import { useSwipeable } from 'react-swipeable';
import { memo } from 'react';

function TodoList({ todos, toggleTodo, deleteTodo, swipingId, setSwipingId }) {
  
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
    <ul {...swipeHandlers} className="w-full">
      {todos.map(todo => (
        <li
          key={todo.id}
          data-id={todo.id}
          className={swipingId === todo.id ? 'transform -translate-x-full transition-transform duration-300' : ''}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id, todo.completed)}
          />
          <span className={todo.completed ? 'line-through' : ''}>{todo.task}</span>
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

export default memo(TodoList);