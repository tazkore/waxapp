import { cn } from '@/lib/utils';
import AvatarUpload from './AvatarUpload';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
}

interface ProfileSidebarProps {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  email?: string;
  role: 'Admin' | 'Cliente';
  navItems: NavItem[];
  onAvatarUpdated?: (url: string) => void;
  className?: string;
}

const ProfileSidebar = ({
  userId,
  avatarUrl,
  name,
  email,
  role,
  navItems,
  onAvatarUpdated,
  className,
}: ProfileSidebarProps) => {
  return (
    <aside
      className={cn(
        'w-full md:w-64 shrink-0 flex flex-col gap-6 bg-card border-b md:border-b-0 md:border-r border-border p-5 md:min-h-full',
        className
      )}
    >
      {/* Avatar & User Info */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <AvatarUpload
          userId={userId}
          avatarUrl={avatarUrl}
          name={name}
          role={role}
          onAvatarUpdated={onAvatarUpdated}
        />

        <div className="text-center">
          <p className="font-semibold text-foreground text-sm leading-tight">{name}</p>
          {email && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{email}</p>}
          <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {role}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block h-px bg-border" />

      {/* Navigation */}
      <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all text-left whitespace-nowrap',
                item.active
                  ? 'bg-primary/10 text-primary border-l-2 md:border-l-2 border-primary pl-[10px]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent pl-[10px]'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', item.active && 'text-primary')} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default ProfileSidebar;
