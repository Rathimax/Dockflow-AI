export default function Footer() {
  return (
    <footer className="py-8 bg-background transition-colors duration-300">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-foreground/50">
          © {new Date().getFullYear()} DocFlow AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
