import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/constants";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Your Personal AI Clean-Air Navigator — built for PromptWars Virtual
        Challenge&nbsp;6.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Sources</CardTitle>
            <CardDescription>Transparent, verifiable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="verified">Live</Badge>
              <span>OpenAQ — monitoring station observations</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="modeled">Model</Badge>
              <span>Open-Meteo — forecast & modeled AQ data</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Engine</CardTitle>
            <CardDescription>Interprets, never fabricates</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Google Gemini processes verified measurements to generate
            personalized health recommendations, indoor-air strategies, and
            sustainable lifestyle tips.
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Our Commitments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Every measurement retains its source, station, timestamp, and unit.</li>
              <li>Modeled data is always labeled distinctly from station readings.</li>
              <li>AI never generates pollution numbers — it interprets validated evidence.</li>
              <li>Guest users can access core features without signing in.</li>
              <li>API keys are kept server-side; no secrets reach the browser.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
