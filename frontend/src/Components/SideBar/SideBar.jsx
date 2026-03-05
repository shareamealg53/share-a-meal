import { NavLink, useNavigate } from "react-router-dom";
import { 
  FaThLarge, FaSearch, FaRegFileAlt, 
  FaTruck, FaComments, FaCog, 
  FaSignOutAlt, FaTimes 
} from "react-icons/fa";
import styles from "./SideBar.module.css";

const Sidebar = ({ isMobileOpen, closeSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("orgName");
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", path: "/ngo", icon: <FaThLarge /> },
    { name: "Browse Food", path: "/browse", icon: <FaSearch /> },
    { name: "Reserve", path: "/reserve", icon: <FaRegFileAlt /> },
    { name: "Pickup", path: "/pickup", icon: <FaTruck /> },
    { name: "Messages", path: "/messages", icon: <FaComments />, badge: 3 },
    { name: "Settings", path: "/settings", icon: <FaCog /> },
  ];

  return (
    <>
      {/* 1. Backdrop Overlay: Only visible on mobile when sidebar is open */}
      {isMobileOpen && <div className={styles.overlay} onClick={closeSidebar}></div>}

      {/* 2. Sidebar Container */}
      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.mobileOpen : ""}`}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>🍽️</div>
          <span className={styles.logoText}>Share A Meal</span>
          
          {/* Mobile Only: Close Button */}
          <button className={styles.closeBtn} onClick={closeSidebar}>
            <FaTimes />
          </button>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => isActive ? styles.active : styles.link}
              onClick={closeSidebar} // Close sidebar when a link is clicked on mobile
            >
              {item.icon}
              <span className={styles.linkText}>{item.name}</span>
              {item.badge && <span className={styles.badge}>{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;