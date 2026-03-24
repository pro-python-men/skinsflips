export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  return Response.json({
    skins: [
      { name: "AK-47 Redline", price: 12.5 },
      { name: "AWP Asiimov", price: 115 },
      { name: "M4A1-S Printstream", price: 80 }
    ]
  })
}