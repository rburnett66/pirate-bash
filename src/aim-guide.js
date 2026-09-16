// Trim by arc length, not sample count, so the guide is exactly half as long.
export function aimGuide(path,fraction=.5){
 if(!path.length)return [];
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y)),target=lengths.reduce((a,b)=>a+b,0)*fraction,result=[path[0]];
 let covered=0;
 for(let i=0;i<lengths.length;i++){
  const a=path[i],b=path[i+1],length=lengths[i];
  if(covered+length>=target){const r=length?(target-covered)/length:0;result.push({x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r});break;}
  result.push(b);covered+=length;
 }
 return result;
}
