import React,{useState} from "react";
import './TodoList.css';

function TodoList(){
    const [todos, setTodos] = useState([]);
    const [inputValue, setInputValue] = useState("");

    const addTodo = () => {
        if(inputValue.trim()!== ''){
            const newTodo = {
                id: Date.now(),
                text: inputValue,
                completed: false,
            };
            setTodos([...todos, newTodo]);
            setInputValue("");
        }
    };

    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !==id));
    };

    const toggleComplete =(id) => {
        setTodos(todos.map(todo => todo.id === id ? {...todo, completed: !todo.completed} : todo));
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleKeyPress = (e) => {
        if(e.key === 'Enter'){
            addTodo();
        }
    };

    return(
        <div className="todolist-container">
           <h1>TodoList</h1>

           {/*输入区域*/}
           <div className="input-section">
              <input 
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Add a new todo..."
                className="todo-input"
              />
              <button onClick={addTodo} 
              className="add-button">
                添加
              </button>
           </div>

           {/* 待办事项列表 */}
           <div className="todos-section">
            {todos.length ===0 ?(
                <p className="empty-message">暂无待办事项</p>
            ):(
                <ul className="todos-list">
                    {todos.map(todo =>(
                        <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                            <div className="todo-content">
                                <input 
                                   type="checkbox" 
                                   checked={todo.completed}
                                   onChange={()=>toggleComplete(todo.id)}
                                   className="todo-checkbox"
                                />
                                <span className="todo-text">
                                    {todo.text}
                                </span>
                            </div>
                            <button
                                onClick={()=>deleteTodo(todo.id)}
                                className="delete-button"
                            >
                                删除
                            </button>
                        </li>
                    ))}
                </ul>
            )}
           </div>

           {/* 统计信息 */}
           <div className="starts">
              <span>总计：{todos.length}项</span>
              <span><br />已完成：{todos.filter(todo => todo.completed).length}项</span>
              <span><br />未完成：{todos.filter(todo => !todo.completed).length}项</span>
           </div>
        </div>
    );
} 

export default TodoList;