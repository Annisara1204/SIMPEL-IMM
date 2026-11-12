import assert from "node:assert/strict";
import test from "node:test";
import { aggregateIndicators, calculateAspectAggregates, calculateOverallScore, type PlannedIndicator, type SubmittedRating } from "../lib/phase6-scoring.ts";

const plan=(overrides:Partial<PlannedIndicator>={}):PlannedIndicator=>({participantId:"p1",rubricVersionId:"v1",localIndicatorId:"i1",competencyIndicatorId:"ci1",assessmentScope:"session",assessmentScopeKey:"session:v1",aspectId:"a1",aspectName:"Intelektualitas",aspectWeight:100,indicatorWeight:100,expectedObserverIds:["o1","o2"],...overrides});
const rating=(overrides:Partial<SubmittedRating>={}):SubmittedRating=>({participantId:"p1",rubricVersionId:"v1",localIndicatorId:"i1",observerId:"o1",submissionStatus:"submitted",responseStatus:"scored",score:4,...overrides});

test("menghitung rata-rata skor valid dari beberapa penilai",()=>{
  const result=aggregateIndicators([plan()],[rating({score:4}),rating({observerId:"o2",score:3})]);
  assert.equal(result[0].average,3.5);
  assert.equal(result[0].validRatings,2);
  assert.equal(result[0].minimum,3);
  assert.equal(result[0].maximum,4);
  assert.equal(result[0].range,1);
});

test("N/O tidak dihitung sebagai nol dan slot observer yang belum submit tetap pending",()=>{
  const result=aggregateIndicators([plan()],[rating({responseStatus:"not_observed",score:null})])[0];
  assert.equal(result.average,null);
  assert.equal(result.validRatings,0);
  assert.equal(result.notObserved,1);
  assert.equal(result.pending,1);
});

test("draft tidak masuk skor resmi",()=>{
  const result=aggregateIndicators([plan()],[rating({submissionStatus:"draft",score:5})])[0];
  assert.equal(result.average,null);
  assert.equal(result.pending,2);
});

test("status moderasi normal untuk rentang 0–1 dan perlu ditinjau untuk rentang minimal 2",()=>{
  assert.equal(aggregateIndicators([plan()],[rating({score:3}),rating({observerId:"o2",score:4})])[0].reviewStatus,"normal");
  assert.equal(aggregateIndicators([plan()],[rating({score:2}),rating({observerId:"o2",score:4})])[0].reviewStatus,"needs_review");
});

test("agregasi tidak mengubah skor sumber Observer",()=>{
  const source=[rating({score:2}),rating({observerId:"o2",score:5})];
  const before=structuredClone(source);
  aggregateIndicators([plan()],[...source]);
  assert.deepEqual(source,before);
});

test("indikator N/O dan yang belum dinilai tidak masuk coverage",()=>{
  const planned=[plan(),plan({localIndicatorId:"i2",competencyIndicatorId:"ci2"}),plan({localIndicatorId:"i3",competencyIndicatorId:"ci3"})];
  const indicators=aggregateIndicators(planned,[rating({score:4}),rating({localIndicatorId:"i2",observerId:"o1",responseStatus:"not_observed",score:null})]);
  const aspects=calculateAspectAggregates(planned,indicators,80);
  assert.equal(aspects[0].plannedIndicators,3);
  assert.equal(aspects[0].assessedIndicators,1);
  assert.ok(Math.abs(aspects[0].coverage-100/3)<1e-9);
  assert.equal(aspects[0].valid,false);
});

test("bobot indikator dipakai untuk nilai aspek",()=>{
  const planned=[plan({indicatorWeight:75}),plan({localIndicatorId:"i2",competencyIndicatorId:"ci2",indicatorWeight:25})];
  const indicators=aggregateIndicators(planned,[rating({score:4}),rating({localIndicatorId:"i2",observerId:"o1",score:2})]);
  const aspect=calculateAspectAggregates(planned,indicators,50)[0];
  assert.equal(aspect.score,3.5);
  assert.equal(aspect.scoreOutOf100,70);
});

test("overall score memakai bobot aspek Phase 2 dan tetap provisional jika ada aspek tidak valid",()=>{
  const names=["Intelektualitas","Religiusitas","Humanitas","Partisipasi dan Kolaborasi","Kedisiplinan dan Tanggung Jawab","Komitmen dan Tindak Lanjut"];
  const weights=[25,20,20,15,10,10];
  const scores=[3.8,4,3.5,4,4.5,3.5];
  const aspects=names.map((aspectName,index)=>({aspectId:`a${index}`,aspectName,weight:weights[index],score:scores[index],scoreOutOf100:scores[index]/5*100,plannedIndicators:1,assessedIndicators:1,notObservedIndicators:0,pendingIndicators:0,coverage:100,valid:true}));
  assert.equal(calculateOverallScore(aspects).score,77);
  assert.equal(calculateOverallScore(aspects.map((aspect,index)=>index===0?{...aspect,valid:false}:aspect)).status,"provisional");
  assert.equal("graduationDecision" in calculateOverallScore(aspects),false);
});
