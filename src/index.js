import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/css/styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);


// src/index.js
// import React from "react";
// import ReactDOM from "react-dom/client";
// import "./assets/css/styles.css";
// import App from "./App";

// // Providers
// import { AuthProvider } from "./contexts/AuthContext";
// import { PropertyProvider } from "./contexts/PropertyContext";

// const root = ReactDOM.createRoot(document.getElementById("root"));
// root.render(
//   <React.StrictMode>
//     <AuthProvider>
//       <PropertyProvider>
//         <App />
//       </PropertyProvider>
//     </AuthProvider>
//   </React.StrictMode>
// );
