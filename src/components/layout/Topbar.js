import { useEffect, useState } from "react";
import { listMyProperties, getCurrentPropertyCode, setCurrentPropertyCode } from "../../lib/propertyStore";
import "./Topbar.css";

export default function Topbar() {
  const [now, setNow] = useState(new Date());
  const [propsList, setPropsList] = useState([]);
  const [currentCode, setCurrentCode] = useState(getCurrentPropertyCode());

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // load properties once
  useEffect(() => {
    (async () => {
      try {
        const list = await listMyProperties();
        setPropsList(list);
        if (!currentCode && list[0]?.code) {
          setCurrentPropertyCode(list[0].code);
          setCurrentCode(list[0].code);
        }
      } catch {
        setPropsList([]);
      }
    })();
  }, []); // eslint-disable-line

  const onChangeProp = (e) => {
    const code = e.target.value || "";
    setCurrentPropertyCode(code);
    setCurrentCode(code);
  };

  const currentName = propsList.find(p => p.code === currentCode)?.name || currentCode || "—";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img src="/logo.png" alt="Trustify" className="topbar-logo" />
      </div>

      <div className="topbar-center">
        <span>Switch Property : </span>
        <select className="topbar-branch" value={currentCode} onChange={onChangeProp}>
          {propsList.map(p => (
            <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
          ))}
        </select>
        <span className="topbar-period">Apr 1 2025 – Mar 31 2026</span>
      </div>

      <div className="topbar-right">
        <span className="topbar-user">Buser</span>
        <span className="topbar-datetime">
          {now.toLocaleDateString()} {now.toLocaleTimeString()}
        </span>
        <button className="btn small">Audit</button>
        <button className="icon-btn">☰</button>
        <button className="icon-btn">⚙</button>
        <button className="icon-btn">👤</button>
      </div>
    </header>
  );
}
