import { useEffect, useMemo, useState } from "react";
import type { Word, ProgressMap, Progress } from "./types";

const STORAGE = "medvocab-progress-v1";
const initialProgress = (words: Word[]): ProgressMap => Object.fromEntries(words.map(w => [w.id, {status:"new",dueAt:0,correct:0,wrong:0}]));
const schedule = (p: Progress, correct: boolean, isNew: boolean): Progress => {
  if (!correct) return {...p,status:"learning",dueAt:Date.now()+10*60*1000,wrong:p.wrong+1,lastSeen:Date.now(),...(isNew?{newSeenAt:Date.now()}:{})};
  const next = p.correct + 1;
  const days = next === 1 ? 1 : next === 2 ? 3 : next === 3 ? 7 : 14;
  return {...p,status:next>=3?"known":"learning",dueAt:Date.now()+days*86400000,correct:next,lastSeen:Date.now(),...(isNew?{newSeenAt:Date.now()}:{})};
};

export default function App() {
  const [words,setWords] = useState<Word[]>([]);
  const [progress,setProgress] = useState<ProgressMap>({});
  const [tab,setTab] = useState("today");
  const [revealed,setRevealed] = useState(false);
  const [cardIndex,setCardIndex] = useState(0);
  const [cardFlipped,setCardFlipped] = useState(false);
  const [exampleShown,setExampleShown] = useState(false);
  const [direction,setDirection] = useState<"en-tr"|"tr-en">("en-tr");
  const [sessionDone,setSessionDone] = useState(0);
  const [examMode,setExamMode] = useState<"vocabulary"|"context"|"reading"|"mixed">("vocabulary");
  const [examQuestions,setExamQuestions] = useState<Array<{word:Word;kind:"vocabulary"|"context"|"reading";prompt:string;answer:string;passage?:string}>>([]);
  const [examStarted,setExamStarted] = useState(false);
  const [examIndex,setExamIndex] = useState(0);
  const [examAnswers,setExamAnswers] = useState<Record<number,string>>({});
  const [examDone,setExamDone] = useState(false);

  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/words.json`).then(r=>r.json()).then((data:Word[])=>setWords(data)).catch(()=>setWords([])); },[]);
  useEffect(() => { if (!words.length) return; try { const saved=localStorage.getItem(STORAGE); const parsed=saved?JSON.parse(saved) as ProgressMap:{}; setProgress({...initialProgress(words),...(parsed&&typeof parsed==="object"?parsed:{})}); } catch { setProgress(initialProgress(words)); } },[words]);
  useEffect(() => { if (Object.keys(progress).length) localStorage.setItem(STORAGE,JSON.stringify(progress)); },[progress]);

  const due = useMemo(()=>words.filter(w=>(progress[w.id]?.dueAt??0)>0 && (progress[w.id]?.dueAt??0)<=Date.now()).sort((a,b)=>(progress[a.id]?.dueAt??0)-(progress[b.id]?.dueAt??0)),[words,progress]);
  const fresh = useMemo(()=>words.filter(w=>(progress[w.id]?.status??"new")==="new"),[words,progress]);
  const todayCount = Object.values(progress).filter(p=>p.newSeenAt && new Date(p.newSeenAt).toDateString()===new Date().toDateString()).length;
  const queue = useMemo(()=>[...due,...fresh.slice(0,Math.max(0,20-todayCount))],[due,fresh,todayCount]);
  const current = queue[0];
  const currentCard = words[cardIndex];
  const studied = todayCount;
  const learned = Object.values(progress).filter(p=>p.status==="known").length;
  const wrong = words.filter(w=>(progress[w.id]?.wrong??0)>0).sort((a,b)=>(progress[b.id]?.wrong??0)-(progress[a.id]?.wrong??0));
  const totalCorrect = Object.values(progress).reduce((n,p)=>n+p.correct,0);
  const totalWrong = Object.values(progress).reduce((n,p)=>n+p.wrong,0);
  const weekDays = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d;});
  const streak = (()=>{let n=0;const active=new Set(Object.values(progress).filter(p=>p.lastSeen).map(p=>new Date(p.lastSeen!).toDateString()));for(let i=0;i<365;i++){const d=new Date();d.setDate(d.getDate()-i);if(active.has(d.toDateString()))n++;else if(i>0)break;}return n;})();
  const mark = (ok:boolean) => { if(!current)return; const isNew=(progress[current.id]?.status??"new")==="new"; setProgress(prev=>({...prev,[current.id]:schedule(prev[current.id]??{status:"new",dueAt:0,correct:0,wrong:0},ok,isNew)})); setRevealed(false); setDirection(Math.random()>.5?"en-tr":"tr-en"); setSessionDone(n=>n+1); };
  const startExam=()=>{
    const pool=[...words].sort(()=>Math.random()-.5).slice(0,10);
    const questions=pool.map((word,i)=>{
      const kind=examMode==="mixed"?(["vocabulary","context","reading"] as const)[i%3]:examMode;
      const passage=kind==="reading"?[word.exampleEn,...pool.filter(item=>item.id!==word.id).slice(0,3).map(item=>item.exampleEn)].join(" "):undefined;
      const sentence=word.exampleEn; const position=sentence.toLocaleLowerCase("en").indexOf(word.english.toLocaleLowerCase("en")); const cloze=position>=0?sentence.slice(0,position)+"_____"+sentence.slice(position+word.english.length):sentence;
      const prompt=kind==="vocabulary"?`Türkçe karşılığını yaz: ${word.english}`:kind==="context"?cloze:`Metinde geçen “${word.english}” ifadesinin Türkçe karşılığını yaz.`;
      return {word,kind,prompt,answer:kind==="context"?word.english:word.turkish,passage};
    });
    setExamQuestions(questions);setExamStarted(true);setExamIndex(0);setExamAnswers({});setExamDone(false);
  };
  const normalise=(value:string)=>value.toLocaleLowerCase("tr-TR").replace(/[.,;:!?()]/g,"").replace(/\s+/g," ").trim();
  const score=examQuestions.filter(q=>{
    const answer=normalise(examAnswers[q.word.id]??"");
    const accepted=q.kind==="context"?[q.word.english]:q.word.turkish.split(/[;,]/).map(s=>s.trim());
    return accepted.some(item=>answer===normalise(item)||(normalise(item).includes(answer)&&answer.length>2));
  }).length;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">M</span><div><b>MEDVOCAB</b><small>HEALTH ENGLISH</small></div></div>
      <div className="side-label">ÇALIŞMA ALANI</div>
      {[["today","◷","Bugünkü çalışma"],["words","▤","Kelime kartları"],["wrong","↺","Yanlışlarım"],["weekly","▦","Haftalık rapor"],["exam","◎","Sınav modu"]].map(([id,icon,label])=><button key={id} className={tab===id?"nav active":"nav"} onClick={()=>{setTab(id);setRevealed(false);}}><span>{icon}</span>{label}{id==="wrong"&&wrong.length>0&&<i>{wrong.length}</i>}</button>)}
      <div className="sidebar-bottom"><span className="pulse-dot"/> Kişisel çalışma alanı<small>Kaynak: YÖKDİL Sağlık PDF</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">YÖKDİL · SAĞLIK BİLİMLERİ</span><h1>{({today:"Günlük çalışma",words:"Kelime kartları",wrong:"Yanlış cevaplar",weekly:"Haftalık ilerleme",exam:"Sınav modu"} as Record<string,string>)[tab]}</h1></div><div className="top-actions"><span className="streak">♨ {streak} gün seri</span><span className="avatar">D</span></div></header>
      {tab==="today"&&<><section className="welcome"><div><span className="eyebrow light">BUGÜNÜN HEDEFİ</span><h2>Az ama düzenli.<br/><em>Her gün biraz daha iyi.</em></h2><p>Önce zamanı gelen tekrarlar, ardından yeni kelimeler.</p></div><div className="target"><strong>{Math.min(studied,20)}<small>/20</small></strong><span>Günlük hedef</span><div className="progress-line"><i style={{width:`${Math.min(studied/20*100,100)}%`}}/></div></div></section>
      <div className="stats"><div className="stat"><span>TAMAMLANAN KELİME</span><b>{learned}</b><small>öğrenildi</small></div><div className="stat"><span>TEKRAR BEKLEYEN</span><b>{due.length}</b><small>bugün zamanı gelen</small></div><div className="stat"><span>YANLIŞ CEVAP</span><b>{totalWrong}</b><small>toplam hata</small></div><div className="stat"><span>DOĞRU CEVAP</span><b>{totalCorrect}</b><small>toplam doğru</small></div></div>
      <section className="study-layout"><div className="side-panel"><div className="panel-title">BUGÜNKÜ ÇALIŞMA</div><div className="step"><b>01</b><div><strong>Tekrarlar</strong><small>{due.length} kelime zamanı geldi</small></div></div><div className="step"><b>02</b><div><strong>Yeni kelimeler</strong><small>{fresh.length} kelime öğrenilmeyi bekliyor</small></div><span>→</span></div><div className="panel-note"><strong>Hatırlatma</strong><p>Kart çalışmasına sol menüdeki “Kelime kartları” bölümünden devam edebilirsin.</p></div></div></section></>}
      {tab==="words"&&<section className="list-panel card-library"><div className="panel-title">KELİME KARTLARI <span>{words.length?cardIndex+1:0} / {words.length}</span></div>{currentCard?<><div className={cardFlipped?"library-card flipped":"library-card"} onClick={()=>setCardFlipped(v=>!v)} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&setCardFlipped(v=>!v)}><div className="library-card-inner"><div className="library-card-front"><span className="direction">KELİME</span><h2>{currentCard.english}</h2><p>{cardFlipped?currentCard.turkish:"Anlamı görmek için karta dokun"}</p></div><div className="library-card-back"><span className="direction">ANLAMI</span><h2>{currentCard.turkish}</h2><p>{currentCard.english}</p></div></div></div><div className="card-actions library-actions"><button className="btn ghost" onClick={()=>setExampleShown(v=>!v)}>{exampleShown?"Örneği gizle":"Örnek"}</button><button className="btn primary" onClick={()=>setCardFlipped(v=>!v)}>{cardFlipped?"Kelimeyi göster":"Anlamı göster"}</button><button className="btn ghost" onClick={()=>{setCardIndex(i=>Math.max(0,i-1));setCardFlipped(false);setExampleShown(false)}} disabled={cardIndex===0}>Önceki</button><button className="btn primary" onClick={()=>{setCardIndex(i=>Math.min(words.length-1,i+1));setCardFlipped(false);setExampleShown(false)}} disabled={cardIndex>=words.length-1}>Sonraki</button></div>{exampleShown&&<div className="example library-example"><small>ÖRNEK KULLANIM</small><p>{currentCard.exampleEn}</p><p className="translation">{currentCard.exampleTr}</p></div>}</>:<div className="empty"><h3>Kelime havuzu yükleniyor</h3></div>}</section>}
      {tab==="wrong"&&<section className="list-panel"><div className="panel-title">TEKRAR GEREKENLER <span>{wrong.length} kelime</span></div>{wrong.length?wrong.map(w=><div className="word-row" key={w.id}><b>{w.english}</b><span>{w.turkish}</span><small>{progress[w.id].wrong} yanlış</small></div>):<div className="empty"><h3>Henüz yanlış cevabın yok</h3><p>Çalışma sırasında “Tekrar et” dediğin kelimeler burada birikecek.</p></div>}</section>}
      {tab==="weekly"&&<section className="list-panel"><div className="panel-title">SON 7 GÜN</div><div className="week-grid">{weekDays.map(d=>{const count=Object.values(progress).filter(p=>p.lastSeen&&new Date(p.lastSeen).toDateString()===d.toDateString()).length;return <div className="day" key={d.toISOString()}><span>{d.toLocaleDateString("tr-TR",{weekday:"short"})}</span><b className={count?"done":""}>{count}</b><small>kelime</small></div>})}</div><div className="stats"><div className="stat"><span>DOĞRU</span><b>{totalCorrect}</b></div><div className="stat"><span>YANLIŞ</span><b>{totalWrong}</b></div><div className="stat"><span>ÖĞRENİLEN</span><b>{learned}</b></div></div></section>}
      {tab==="exam"&&<section className="list-panel exam-panel"><div className="panel-title">SINAV MODÜLLERİ</div>{!examStarted?<div className="empty"><div className="empty-icon">◎</div><h3>Bilgini ölçmeye hazır mısın?</h3><p>PDF’deki kelimelerle dört farklı çalışma biçimi.</p><div className="exam-modes"><button className={examMode==="vocabulary"?"btn primary":"btn ghost"} onClick={()=>setExamMode("vocabulary")}>Kelime</button><button className={examMode==="context"?"btn primary":"btn ghost"} onClick={()=>setExamMode("context")}>Bağlam / Boşluk</button><button className={examMode==="reading"?"btn primary":"btn ghost"} onClick={()=>setExamMode("reading")}>Sağlık metni</button><button className={examMode==="mixed"?"btn primary":"btn ghost"} onClick={()=>setExamMode("mixed")}>Karma mini sınav</button></div><button className="btn primary" onClick={startExam} disabled={!words.length}>Sınava başla</button>{!words.length&&<small>Kelime havuzu yükleniyor.</small>}</div>:examDone?<div className="empty"><h3>Sınav tamamlandı</h3><strong className="score">{score} / {examQuestions.length}</strong><p>Yanlış cevaplarını tekrar listesinde inceleyebilirsin.</p><button className="btn primary" onClick={()=>setExamStarted(false)}>Kapat</button></div>:<div className="exam-question"><span>SORU {examIndex+1} / {examQuestions.length} · {examQuestions[examIndex]?.kind==="vocabulary"?"KELİME":examQuestions[examIndex]?.kind==="context"?"BAĞLAM":"OKUMA"}</span>{examQuestions[examIndex]?.passage&&<p className="reading-passage">{examQuestions[examIndex].passage}</p>}<h2>{examQuestions[examIndex]?.prompt}</h2><input value={examAnswers[examQuestions[examIndex]?.word.id]??""} onChange={e=>setExamAnswers(p=>({...p,[examQuestions[examIndex].word.id]:e.target.value}))} placeholder={examQuestions[examIndex]?.kind==="context"?"İngilizce kelime veya ifade…":"Türkçe anlamını yaz…"}/><button className="btn primary" onClick={()=>examIndex+1===examQuestions.length?setExamDone(true):setExamIndex(i=>i+1)}>{examIndex+1===examQuestions.length?"Sınavı bitir":"Sonraki soru"}</button></div>}</section>}
      <footer>MEDVOCAB <span>Yalnızca yüklenen YÖKDİL Sağlık kelime kaynağı temel alınır.</span></footer>
    </main>
  </div>;
}
