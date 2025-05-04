import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ShowDetails from "@/pages/show-details";
import Discover from "@/pages/discover";
import Favorites from "@/pages/favorites";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

function App() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/show/:id" component={ShowDetails} />
            <Route path="/discover" component={Discover} />
            <Route path="/favorites" component={Favorites} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
