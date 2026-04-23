import { Link } from "react-router-dom";
import { Heart, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Footer = () => (
  <footer className="border-t bg-card/80 backdrop-blur-sm mt-auto">
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo-horizontal.png" alt="BoatBuyer" className="h-7 w-auto" />
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm font-medium">Žiga Pirc</p>
          <a href="mailto:pirc.ziga@gmail.com" className="text-xs text-primary hover:underline flex items-center gap-1 justify-center sm:justify-end mt-0.5">
            <Mail className="w-3 h-3" /> pirc.ziga@gmail.com
          </a>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4 italic">Made by a boat owner, for boat owners ⛵</p>
      <div className="mt-4 flex justify-center">
        <a href="https://buymeacoffee.com/pirczigau" target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-full">
            <Heart className="w-3.5 h-3.5 text-coral" /> Support this project
          </Button>
        </a>
      </div>
      <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p>© {new Date().getFullYear()} BoatBuyer. All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/" state={{ openImport: true }} className="hover:text-primary transition-colors">Import boat</Link>
          <Link to="/cost" className="hover:text-primary transition-colors">Costs</Link>
          <Link to="/my-boats" className="hover:text-primary transition-colors">My Boats</Link>
        </div>
      </div>
    </div>
  </footer>
);
