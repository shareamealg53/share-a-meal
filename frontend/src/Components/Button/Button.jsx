import { NavLink } from "react-router-dom";
import styles from "./Button.module.css";

export default function Button() {
  return (
    <NavLink to="/signup">
      <button className={styles.primaryBtn}>Get Started</button>
    </NavLink>
  );
}
