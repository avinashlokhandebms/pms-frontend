// src/pages/PosPage.js
import { useNavigate } from "react-router-dom";
import "./ModuleBase.css";
import PosSidebar from "../../components/sidebar/Possidebar";

export default function PosPage() {
  const navigate = useNavigate();
  return (
    <div className="module-wrap">
      <PosSidebar/>
     
    </div>
  );
}
