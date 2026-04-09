import { clsx } from 'clsx';
import classes from './route.module.scss';

export function RouteError({
  error,
}: {
  error: Error;
  info?: { componentStack: string };
  reset?: () => void;
}) {
  const router = useRouter();
  return (
    <div className={classes.routeStatusViewport}>
      <div className={classes.routeStatusCard}>
        <span
          className={clsx(
            'i-mdi-alert-circle-outline',
            classes.routeStatusIcon,
            classes.routeStatusIconError,
          )}
          aria-hidden="true"
        />
        <div className={classes.routeStatusBody}>
          <p className={classes.routeStatusTitle}>页面遇到了错误</p>
          <p className={classes.routeStatusDesc}>{error.message || '未知错误'}</p>
        </div>
        <button
          type="button"
          className={classes.routeStatusAction}
          onClick={() => router.invalidate()}
        >
          重试
        </button>
      </div>
    </div>
  );
}
