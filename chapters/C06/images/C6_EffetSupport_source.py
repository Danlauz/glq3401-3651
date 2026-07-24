import numpy as np, matplotlib.pyplot as plt
from matplotlib.patches import Polygon, PathPatch
from matplotlib.path import Path
import math
plt.rcParams['font.family']='DejaVu Sans'

def lognpdf(z,M,s):
    mu=np.log(M)-s**2/2; z=np.clip(z,1e-6,None)
    return 1/(z*s*np.sqrt(2*np.pi))*np.exp(-(np.log(z)-mu)**2/(2*s**2))

M=0.45; z=np.linspace(0,1.45,1500)
data =lognpdf(z,M,0.80); small=lognpdf(z,M,0.55); large=lognpdf(z,M,0.38)
zc1,zc2=0.18,0.55

fig,ax=plt.subplots(figsize=(8,7.2))
mL=z<=zc1; mR=z>=zc2
ax.fill_between(z[mL],small[mL],color='#f4a6a0',alpha=0.35,zorder=1)
ax.fill_between(z[mR],small[mR],color='#f4a6a0',alpha=0.35,zorder=1)
ax.fill_between(z[mL],large[mL],color='none',hatch='///',edgecolor='#2e8b2e',lw=0,zorder=2)
ax.fill_between(z[mR],large[mR],color='none',hatch='///',edgecolor='#2e8b2e',lw=0,zorder=2)
ax.plot(z,data ,color='black',lw=2.6,zorder=5)
ax.plot(z,small,color='#e8000b',lw=2.6,zorder=5)
ax.plot(z,large,color='#1a9e1a',lw=2.6,zorder=5)
ymax=large.max()*1.06
for xc in (zc1,zc2): ax.plot([xc,xc],[0,ymax],'k--',lw=1.4,zorder=4)
ax.set_ylim(0,ymax); ax.set_xlim(0,1.45)
ax.spines[['top','right']].set_visible(False)
ax.spines['left'].set_linewidth(1.6); ax.spines['bottom'].set_linewidth(1.6)
ax.set_yticks([]); ax.set_xticks([zc1,zc2,1.42])
ax.set_xticklabels([r'$z_{c1}$',r'$z_{c2}$',r'$Z$'],fontsize=17)
ax.tick_params(length=0)
ax.set_ylabel(r'$f(z)$',fontsize=19,rotation=0,labelpad=22,va='center',style='italic')

# ---- custom legend with support icons ----
lg=ax.inset_axes([0.58,0.55,0.42,0.44]); lg.set_xlim(0,10); lg.set_ylim(0,10)
lg.set_aspect('equal'); lg.axis('off')
CX,CY=math.cos(math.radians(30)),math.sin(math.radians(30))
from matplotlib.patches import Ellipse
def cube(cx,cy,s,cols):
    def P(x,y,z): return (cx+(x-y)*CX*s, cy+((x+y)*CY - z)*s)
    def poly(pts,c): lg.add_patch(Polygon(pts,closed=True,facecolor=c,edgecolor='#3a3128',lw=1.1,joinstyle='round',zorder=3))
    poly([P(1,0,0),P(1,1,0),P(1,1,1),P(1,0,1)],cols[2])
    poly([P(0,1,0),P(1,1,0),P(1,1,1),P(0,1,1)],cols[1])
    poly([P(0,0,1),P(1,0,1),P(1,1,1),P(0,1,1)],cols[0])
def core(cx,cyc,h,rw,rh):
    b=cyc-h/2
    lg.add_patch(Polygon([(cx-rw,b+rh),(cx+rw,b+rh),(cx+rw,b+h),(cx-rw,b+h)],closed=True,facecolor='#a8763f',edgecolor='#3a3128',lw=1.1,zorder=3))
    lg.add_patch(Ellipse((cx,b+rh),2*rw,2*rh,facecolor='#a8763f',edgecolor='#3a3128',lw=1.1,zorder=2))
    lg.add_patch(Ellipse((cx,b+h),2*rw,2*rh,facecolor='#c08a4d',edgecolor='#3a3128',lw=1.1,zorder=4))

rows=[8.4,5.0,1.6]; xic=1.5
core(xic,rows[0],2.2,0.42,0.26)
cube(xic,rows[1],1.15,('#b89263','#7a5f39','#97764a'))
cube(xic,rows[2],1.7 ,('#ac8d5e','#6f5734','#8c6f45'))
lab=[('Carottes','black'),('Petit bloc','#e8000b'),('Grand bloc','#1a9e1a')]
for y,(txt,c) in zip(rows,lab):
    lg.plot([3.4,4.7],[y,y],color=c,lw=2.6)
    lg.text(5.1,y,txt,fontsize=15,va='center',ha='left')

plt.tight_layout()
plt.savefig('/sessions/ecstatic-wonderful-mayer/mnt/outputs/effet_support_fz.png',dpi=200,bbox_inches='tight')
print('ok')
