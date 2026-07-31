import Gallery from "./Gallery";
import {createHashRouter, RouterProvider} from 'react-router';
import {Footer} from "./Footer";
import {PrivacyPolicy, CookiePolicy} from "./Policies";
import SpeciesIndex from "./SpeciesIndex";
import Stats from "./Stats";

const router = createHashRouter([
  {
    path: "/",
    element: <Gallery/>,
  },
  {
    path: "/specie",
    element: <SpeciesIndex/>,
  },
  {
    path: "/numeri",
    element: <Stats/>,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy/>,
  },
  {
    path: "/cookie",
    element: <CookiePolicy/>,
  },
]);

export default function App() {
  return <div style={{display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
    <div style={{flex: 1}}>
      <RouterProvider router={router}/>
    </div>
    <Footer/>
  </div>
}
