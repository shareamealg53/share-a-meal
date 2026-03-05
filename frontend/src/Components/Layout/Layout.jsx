import { Outlet } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
// import SmeDash from "../SmeDash/SmeDash";
import Footer from "../Footer/Footer";
import { useState } from "react";
// import NgoDash from "../NgoDash/NgoDash";


function Layout() {
    const [open, setOpen] = useState(false);
  
    return (
      <div className="app">
        <Navbar toggle={() => setOpen(!open)} open={open} /> 
        <div className="main">
          <div className="content">
            <Outlet/>
          </div>
          {/* <div><SmeDash/></div> */}
          {/* <div><NgoDash/></div> */}
        </div>
        <Footer />
      </div>
    );
  }

export default Layout;