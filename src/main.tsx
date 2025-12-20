import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Developer credit
console.log('JNK Nutrition Sales System');
console.log('Developed by: Mazhar Rony');
console.log('Website: www.meetmazhar.com');
console.log('Professional Web Development Services');

createRoot(document.getElementById("root")!).render(<App />);
