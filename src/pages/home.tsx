import { Link } from "react-router-dom";
import {
  Wind,
  MapPin,
  Brain,
  ShieldCheck,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FEATURES = [
  {
    icon: MapPin,
    title: "Real Station Data",
    description:
      "Live pollution readings from verified monitoring stations across India, never simulated or fabricated.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Gemini AI interprets validated data to provide personalized health and lifestyle recommendations.",
  },
  {
    icon: ShieldCheck,
    title: "Indoor Protection",
    description:
      "Practical measures to protect your indoor air quality based on current outdoor conditions.",
  },
  {
    icon: Leaf,
    title: "Sustainable Alternatives",
    description:
      "Discover cleaner commute options, low-emission activities, and eco-friendly lifestyle choices.",
  },
] as const;

export function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Wind className="h-4 w-4" />
              Breathe Informed
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {APP_NAME}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              {APP_TAGLINE}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
              Make better daily decisions using verified environmental data,
              AI-personalized recommendations, and practical indoor protection
              measures — all across India.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/dashboard">
                <Button size="lg">
                  Check Your Air Quality
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Clean Air Intelligence
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need to understand, protect, and improve the air you
            breathe.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Data transparency notice */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Data Transparency:</strong>{" "}
              Every measurement shown on VayuVerse comes from verified
              monitoring stations (OpenAQ) or is explicitly labeled as a
              forecast model (Open-Meteo). We never simulate, fabricate, or
              hardcode pollution data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
