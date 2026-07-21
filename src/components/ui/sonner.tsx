import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "group toast !border-0 !shadow-lg !rounded-2xl !font-medium",
          title: "!font-semibold",
          description: "!opacity-90",
          actionButton: "!bg-white/20 !text-inherit",
          cancelButton: "!bg-black/10 !text-inherit",
          success:
            "!bg-emerald-600 !text-white [&_[data-description]]:!text-emerald-50",
          error:
            "!bg-red-600 !text-white [&_[data-description]]:!text-red-50",
          warning:
            "!bg-yellow-400 !text-yellow-950 [&_[data-description]]:!text-yellow-900",
          info:
            "!bg-sky-600 !text-white [&_[data-description]]:!text-sky-50",
          loading:
            "!bg-slate-800 !text-white [&_[data-description]]:!text-slate-200",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
