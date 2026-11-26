import { BarChart3 } from 'lucide-react';
import type { PlatformMetric } from '../../types';
import { StatusText } from '../StatusText';

interface ClubAnalyticsViewProps {
  metrics: PlatformMetric[];
}

export function ClubAnalyticsView({ metrics }: ClubAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Engagement & Analytics</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Recorded metrics by platform and reporting period. These demonstration records do not
          establish live provider results; provider collection time and freshness are unverified.
        </p>
      </div>

      {metrics.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          No analytics data available for this workspace yet. Connect an approved Facebook Page or
          Instagram Professional account to view reporting.
        </div>
      ) : (
        <div className="space-y-6">
          {metrics.map((m) => {
            const maxReach = Math.max(...m.dailySeries.map((d) => d.reach), 1);
            return (
              <section
                key={m.metricId}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-[#004B87]" />
                      <h2 className="text-base font-bold text-slate-900">
                        {m.platform} · {m.handle}
                      </h2>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Reporting Period: {m.reportingPeriod}
                    </div>
                  </div>
                  <StatusText status="Demo data · unverified" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Published Posts</div>
                    <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                      {m.publishedPosts}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Publish Success Rate</div>
                    <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                      {m.publishingSuccessRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Engagements</div>
                    <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                      {m.engagementCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Reach</div>
                    <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                      {m.reach.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Impressions</div>
                    <div className="text-xl font-bold font-mono-tabular text-slate-900 mt-1">
                      {m.impressions.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Follower Growth</div>
                    <div className="text-xl font-bold font-mono-tabular text-emerald-700 mt-1">
                      +{m.followerGrowth}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-600 mb-3">
                    Recorded 7-Day Reach & Engagement Trend ({m.platform})
                  </div>
                  <div className="grid grid-cols-7 gap-3 items-end h-32">
                    {m.dailySeries.map((day) => {
                      const heightPct = Math.max(12, Math.round((day.reach / maxReach) * 100));
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="text-[10px] font-mono-tabular text-slate-500">
                            {day.reach}
                          </div>
                          <div
                            className="w-full max-w-[36px] bg-[#004B87] rounded-t"
                            style={{ height: `${heightPct}%` }}
                            title={`${day.date}: ${day.reach} reach, ${day.engagement} engagements`}
                          />
                          <div className="text-[11px] font-mono-tabular text-slate-600">
                            {day.date}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
