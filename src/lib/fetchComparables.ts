import { supabase } from "@/integrations/supabase/client";

export async function fetchComparables(boatType: string, year: number) {
  const { data } = await supabase
    .from("cached_listings")
    .select("price_eur, length_feet")
    .eq("boat_type", boatType)
    .gte("year", year - 2)
    .lte("year", year + 2)
    .not("price_eur", "is", null)
    .not("length_feet", "is", null)
    .gt("price_eur", 0)
    .gt("length_feet", 0)
    .limit(200);

  return (data || []).map(d => ({
    price_eur: Number(d.price_eur),
    length_feet: Number(d.length_feet),
  }));
}
