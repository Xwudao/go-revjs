import { clsx } from 'clsx';
import classes from './route.module.scss';

export function RouteNotFound() {
  return (
    <div className={classes.routeStatusViewport}>
      <div className={classes.routeStatusCard}>
        <span
          className={clsx('i-mdi-map-search-outline', classes.routeStatusIcon)}
          aria-hidden="true"
        />
        <div className={classes.routeStatusBody}>
          <p className={classes.routeStatusTitle}>404 — 页面未找到</p>
          <p className={classes.routeStatusDesc}>请检查网址是否正确。</p>
        </div>
        <Link to="/" className={classes.routeStatusAction}>
          返回首页
        </Link>
      </div>
    </div>
  );
}
