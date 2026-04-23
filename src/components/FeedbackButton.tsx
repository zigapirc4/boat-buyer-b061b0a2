import { useState } from "react";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackButtonProps {
  pagePath?: string;
}

export const FeedbackButton = ({ pagePath }: FeedbackButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) return;
    setIsSending(true);
    const path = pagePath || (typeof window !== "undefined" ? window.location.pathname : null);
    const { error } = await supabase.from("feedback_entries").insert({
      message: trimmed,
      page_path: path,
    });
    setIsSending(false);
    if (error) {
      toast({
        title: "Could not send feedback",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Thanks for your feedback",
      description: "We appreciate it and use it to improve BoatBuyer.",
    });
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white font-semibold text-xs gap-1.5 rounded-full px-4"
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus className="w-3.5 h-3.5" /> Feedback
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share feedback</DialogTitle>
            <DialogDescription>
              Tell us what works well or what we should improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your feedback..."
              className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={isSending || message.trim().length < 3}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
