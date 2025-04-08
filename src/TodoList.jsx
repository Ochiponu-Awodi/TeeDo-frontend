import { useState, memo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TodoItem({ todo, toggleTodo, deleteTodo, swipingId }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(todo.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: swipingId === todo.id ? 'transform 0.3s' : transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-id={todo.id}
      className={swipingId === todo.id ? 'transform -translate-x-full transition-transform duration-300' : 'transition-all'}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id, todo.completed)}
      />
      <span className={todo.completed ? 'line-through' : ''}>{todo.task}</span>
      <button onClick={() => deleteTodo(todo.id)}>Delete</button>
    </li>
  );
}

function TodoList({ todos, toggleTodo, deleteTodo, swipingId, setSwipingId, updateOrder }) {
  const [filter, setFilter] = useState('active');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // Long press 150ms for mobile
        tolerance: 5, // Small movement tolerance
      },
    })
  );

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => {
      const id = e.event.target.closest('li')?.dataset.id;
      console.log('Swiped left:', { id, deltaX: e.deltaX }); // Debug
      if (id && Math.abs(e.deltaX) > 100) {
        deleteTodo(id);
        setSwipingId(null);
      }
    },
    onSwiping: (e) => {
      console.log('Swiping:', { id: e.event.target.closest('li')?.dataset.id, deltaX: e.deltaX }); // Debug
      if (e.dir === 'Left') setSwipingId(e.event.target.closest('li')?.dataset.id);
    },
    onSwiped: () => {
      console.log('Swipe ended'); // Debug
      setSwipingId(null);
    },
    delta: 50,
    trackMouse: true,
    preventDefaultTouchmoveEvent: true,
  });

  const filteredTodos = todos.filter(todo => (filter === 'active' ? !todo.completed : todo.completed));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    console.log('Drag end:', { active: active?.id, over: over?.id }); // Debug
    if (!over || active.id === over.id) return;
    const oldIndex = todos.findIndex(todo => String(todo.id) === active.id); // Use full todos
    const newIndex = todos.findIndex(todo => String(todo.id) === over.id);
    console.log('Indices:', { oldIndex, newIndex, todosIds: todos.map(t => t.id) }); // Debug
    if (oldIndex === -1 || newIndex === -1) {
      console.error('Invalid indices:', { oldIndex, newIndex });
      return;
    }
    const newTodos = Array.from(todos);
    const [moved] = newTodos.splice(oldIndex, 1);
    newTodos.splice(newIndex, 0, moved);
    console.log('New order:', newTodos.map(t => t.id)); // Debug
    updateOrder(newTodos);
  };

  return (
    <div className="todo-container">
      <div className="flex justify-between mb-4">
        <button onClick={() => setFilter('active')} className={filter === 'active' ? 'active' : ''}>Active</button>
        <button onClick={() => setFilter('completed')} className={filter === 'completed' ? 'active' : ''}>Completed</button>
      </div>
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div {...swipeHandlers} className="swipe-wrapper">
          <SortableContext items={todos.map(todo => String(todo.id))}> {/* Use full todos */}
            <ul className="w-full">
              {filteredTodos.length ? (
                filteredTodos.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    toggleTodo={toggleTodo}
                    deleteTodo={deleteTodo}
                    swipingId={swipingId}
                  />
                ))
              ) : (
                <p>No {filter} todos</p>
              )}
            </ul>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}

export default memo(TodoList);