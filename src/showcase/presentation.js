/* Presentation only. Uses the existing evaluation report and camera relay URLs. */
function evaluationViewModel(evaluation) {
 const report=evaluation?.report;
 if(!report?.results)return null;
 if(typeof report.results!=='object'||Array.isArray(report.results))return null;
 const entries=Object.entries(report.results);
 if(!entries.length||entries.some(([,m])=>!m||typeof m!=='object'))return null;
 const activity=entries.some(([,m])=>typeof m.recording_macro_top1==='number');
 const models=entries.map(([name,m])=>({name,
   accuracy:activity?m.recording_macro_top1:(m.fixations?m.top1_at_300ms:null),
   count:activity?m.test_activity_starts:m.fixations}));
 if(models.some(m=>m.accuracy!==null&&(!Number.isFinite(m.accuracy)||m.accuracy<0||m.accuracy>1)))return null;
 const target=models.find(m=>m.name===(activity?'Hour-aware population':'gaze + history'));
 const baseline=models.find(m=>m.name===(activity?'Time-independent population':'gaze only'));
 const delta=target?.accuracy!=null&&baseline?.accuracy!=null?(target.accuracy-baseline.accuracy)*100:null;
 return {activity,models,target,baseline,delta,train:report.train_recordings,test:report.test_recordings,
  synthetic:!!report.synthetic,mock:!!report.mock_arm,axis:Math.min(1,Math.max(.1,Math.ceil(Math.max(...models.map(m=>m.accuracy||0))*12)/10))};
}
let lastEvaluationView='';
export function renderEvaluation(evaluation,busy) {
 const key=JSON.stringify([evaluation?.run_id,evaluation?.failed,evaluation?.report,busy]);
 if(key===lastEvaluationView)return;lastEvaluationView=key;
 const root=document.getElementById('eval-visual');if(!root)return;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 root.replaceChildren();
 if(busy){root.append(node('div','eval-empty','Running the evaluation…'));return;}
 const vm=evaluationViewModel(evaluation);
 if(!vm){const empty=node('div','eval-empty',evaluation?.failed?'Evaluation could not complete.':'No saved evaluation results yet.');empty.append(node('p','',evaluation?.failed?'Open the full report for details.':'Completed evaluation reports will appear here.'));root.append(empty);return;}
 const percent=v=>v==null?'N/A':(v*100).toFixed(2)+'%';
 const title=document.getElementById('eval-title');if(title)title.textContent=vm.activity?'Does time of day help?':vm.synthetic?'Saved synthetic replay results':'How well does intent prediction work?';
 root.append(node('h2','eval-heading',vm.activity?'Activity prediction on real home data':vm.synthetic?'Intent prediction on generated sessions':'Intent prediction on recorded sessions'));
 root.append(node('p','eval-caption',vm.activity?`${vm.train} recordings for training · ${vm.test} different recordings for testing`:(vm.synthetic?'Synthetic replay · demonstration metrics only':vm.mock?'Mock-arm replay · no physical grasp measurement':'Recorded session replay')));
 const savedAt=evaluation?.provenance?.saved_at;
 if(savedAt&&Number.isFinite(Date.parse(savedAt))){const date=new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(savedAt));root.append(node('p','eval-caption',`Saved ${date} (UTC)${vm.synthetic&&Number.isFinite(vm.target?.count)?` · ${vm.target.count} synthetic fixations in the held-out test`:''}`));}
 const metrics=node('div','metric-grid');
 function metric(value,label,detail){const el=node('div','metric');el.append(node('strong','',value));const copy=node('div');copy.append(node('span','',label));if(detail)copy.append(node('small','',detail));el.append(copy);metrics.append(el);}
 metric(percent(vm.target?.accuracy),vm.activity?'Accuracy with time of day':'Accuracy with gaze + history',vm.activity?'Correct top activity predictions':'300 ms before confirmation');
 metric(vm.delta==null?'N/A':(vm.delta>0?'+':'')+vm.delta.toFixed(2)+' pp',vm.activity?'Change from ignoring time of day':'Change from gaze alone','Percentage-point difference');
 const count=vm.target?.count;
 metric(Number.isFinite(count)?count.toLocaleString():'N/A',vm.activity?'Activity starts tested':'Confirmed selections tested','Held-out test data');
 root.append(metrics);
 const chart=node('div','benchmark-chart');chart.setAttribute('role','group');chart.setAttribute('aria-label',vm.activity?'Top activity prediction accuracy by method':'Intent accuracy by method');
 const friendly={'Uniform':'Equal odds','Time-independent population':'Routines without the hour','Hour-aware population':'Routines + time of day','gaze only':'Gaze alone','gaze + history':'Gaze + history'};
 for(const m of vm.models){const row=node('div','benchmark-row'+(m===vm.target?' best':''));const label=node('span','benchmark-label',friendly[m.name]||m.name);const track=node('div','benchmark-track');track.setAttribute('role','img');track.setAttribute('aria-label',(friendly[m.name]||m.name)+': '+percent(m.accuracy));const fill=node('div','benchmark-fill');fill.style.width=(m.accuracy==null?0:m.accuracy/vm.axis*100)+'%';track.append(fill);row.append(label,track,node('span','benchmark-value',percent(m.accuracy)));chart.append(row);}
 const axis=node('div','chart-axis');axis.append(node('span','','0%'),node('span','',Math.round(vm.axis*100)+'% accuracy'));chart.append(axis);root.append(chart);
 const benefit=vm.delta==null?'No confirmed selections were available for this comparison.':vm.delta===0?'Both methods scored equally on this saved test; the measured improvement is 0 percentage points.':vm.activity?`Adding the hour changes top-choice accuracy by ${vm.delta.toFixed(2)} percentage points compared with using routines alone.`:`Adding history changes prediction accuracy by ${vm.delta.toFixed(2)} percentage points compared with gaze alone.`;
 root.append(node('p','eval-explain',benefit));
 root.append(node('p','eval-scope',vm.activity?'This measures activity predictions, not object selection or robot grasp success. The same held-out recordings are reused so results can be compared fairly.':vm.synthetic?'This historical smoke test uses generated gaze and confirmation events. It does not measure people, physical grasps, or real-world performance. No Chalk API call was made. The saved input metadata and full sanitized report appear below.':'This is our custom robotics evaluation. It measures the logged replay, not physical grasp success. Full results and the authorization audit appear below.'));
}

let lastHighlights='';
export function renderRoutineHighlights(highlights){const key=JSON.stringify(highlights);if(key===lastHighlights)return;lastHighlights=key;const root=document.getElementById('routine-highlights');root.replaceChildren();for(const h of highlights){const card=document.createElement('div');card.className='routine-highlight';const time=document.createElement('span');time.textContent=h.time;const object=document.createElement('strong');object.textContent=({mug:'Mug',water_bottle:'Water bottle',phone:'Phone',medication:'Medication'})[h.object]||h.object;card.append(time,object);root.append(card);}}
