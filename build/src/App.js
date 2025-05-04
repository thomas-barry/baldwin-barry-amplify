import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
const client = generateClient();
function App() {
    const [todos, setTodos] = useState([]);
    useEffect(() => {
        client.models.Todo.observeQuery().subscribe({
            next: data => setTodos([...data.items]),
        });
    }, []);
    function createTodo() {
        client.models.Todo.create({ content: window.prompt('Todo content') });
    }
    return (_jsxs("main", { children: [_jsx("h1", { children: "My TODOS" }), _jsx("button", { onClick: createTodo, children: "+ new" }), _jsx("ul", { children: todos.map(todo => (_jsx("li", { children: todo.content }, todo.id))) }), _jsxs("div", { children: ["\uD83E\uDD73 App successfully hosted. Try creating a new todo.", _jsx("br", {}), _jsx("a", { href: "https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates", children: "Review next step of this tutorial." })] })] }));
}
export default App;
//# sourceMappingURL=App.js.map