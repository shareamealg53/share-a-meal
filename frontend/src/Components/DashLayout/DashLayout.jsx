import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../SideBar/SideBar"
import Header from "../Header/Header";   
import styles from "./DashLayout.module.css";
import NGODash from "../NgoDash/NgoDash"
import { FaBars } from "react-icons/fa";

const DashLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const savedRole = (localStorage.getItem("role") || "ngo").toLowerCase();
  const user = {
    type: savedRole,
    name: localStorage.getItem("orgName") || "Share A Meal User",
  };
  let dashboardComponent;

  if (user.type === "ngo") {
    dashboardComponent = <NGODash />;
  } else if (user.type === "sme") {
    dashboardComponent = <NGODash />;
  } else {
    dashboardComponent = <NGODash />;
  }

  return (
    <div className={`${styles.layout} ${styles[user.type]}`}>
      <Sidebar userType={user.type} isMobileOpen={isMobileOpen} closeSidebar={() => setIsMobileOpen(false)}/>
      <div className={styles.main}>
        <div>
        <div className={styles.mobileToggleBar}>
          <button onClick={() => setIsMobileOpen(true)}><FaBars /></button>
          <span>Dashboard</span>
       </div>
          <Header user={user.name} />
        </div>
        <div className={styles.content}>
          {dashboardComponent}
        </div>
      </div>
    </div>
    
  );
};

export default DashLayout;