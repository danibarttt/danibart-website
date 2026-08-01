import Gallery from "./Gallery";
import {createHashRouter, RouterProvider} from 'react-router';
import {Footer} from "./Footer";
import {PrivacyPolicy, CookiePolicy} from "./Policies";
import SpeciesIndex from "./SpeciesIndex";
import Stats from "./Stats";
import {LangProvider} from "./lang";

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

// LangProvider wraps the router *and* the footer: the footer lives outside
// RouterProvider (its links are plain hash links) but still needs the language
export default function App() {
  return <LangProvider>
    <div style={{display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
      <div style={{flex: 1}}>
        <RouterProvider router={router}/>
      </div>
      <Footer/>
    </div>
  </LangProvider>
}
