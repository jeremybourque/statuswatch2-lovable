import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      closeButton
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:relative",
          closeButton:
            "group-[.toast]:!static group-[.toast]:!transform-none group-[.toast]:!border-none group-[.toast]:!bg-transparent group-[.toast]:!shadow-none group-[.toast]:!text-muted-foreground group-[.toast]:!opacity-60 group-[.toast]:hover:!opacity-100 group-[.toast]:!right-0 group-[.toast]:!left-auto group-[.toast]:!top-auto group-[.toast]:shrink-0 group-[.toast]:!w-5 group-[.toast]:!h-5",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
