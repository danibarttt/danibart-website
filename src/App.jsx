import Gallery from "./Gallery";
import {createHashRouter, RouterProvider} from 'react-router';
import {Footer} from "./Footer";

const router = createHashRouter([
  {
    path: "/",
    element: <Gallery/>,
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
