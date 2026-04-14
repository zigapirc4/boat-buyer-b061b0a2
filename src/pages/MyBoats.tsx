import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSavedBoats, deleteBoat, type SavedBoat } from "@/lib/boatStore";

const verdictColor = (v: string) => v === "Good Deal" ? "text-success" : v === "Fair Deal" ? "text-warning" : "text-destructive";

const MyBoats = () => {
  const [boats, setBoats] = useState<SavedBoat[]>(getSavedBoats);

  const handleDelete = (id: string) => {
    deleteBoat(id);
    setBoats(getSavedBoats());
  };

  return (
    <div className="min-h-screen p-4 pb-8 max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-primary mb-6">My Boats</h1>

      {boats.length === 0 ? (
        <p className="text-muted-foreground text-center mt-12">No boats saved yet. Evaluate one first!</p>
      ) : (
        <div className="space-y-3">
          {boats.map((b) => (
            <Card key={b.id} className="p-4 flex items-center justify-between animate-fade-in">
              <div>
                <p className="font-semibold">{b.model}</p>
                <p className="text-sm text-muted-foreground">{b.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold font-display">{b.score}</p>
                  <p className={`text-xs font-semibold ${verdictColor(b.verdict)}`}>{b.verdict}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBoats;
