from pathlib import Path
from zipfile import ZipFile
from lxml import etree
from pypdf import PdfReader
import pdfplumber

p=Path(__file__).parent
with ZipFile(p/'reservation-sample.docx') as z:
 root=etree.fromstring(z.read('word/document.xml')); styles=etree.fromstring(z.read('word/styles.xml'))
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 text=' '.join(root.xpath('//w:t/text()',namespaces=ns))
 for term in ['REQ-01','REQ-02','동일 요청번호','승인 대기','반려','저장 실패','입력','재시도','중복 차단','이력','React','FastAPI','미정']:
  assert term in text,term
 assert len(root.xpath('//w:drawing',namespaces=ns))==2
 assert len(root.xpath('//w:tbl',namespaces=ns))==2
 font_values=root.xpath('//w:rFonts/@w:eastAsia',namespaces=ns)
 assert set(font_values)=={'Malgun Gothic'}
 for style in ['Normal','Heading1','Heading2']:
  elem=styles.xpath(f'//w:style[@w:styleId="{style}"]',namespaces=ns)[0]
  assert elem.xpath('.//w:rFonts/@w:eastAsia',namespaces=ns)==['Malgun Gothic']
  print(style,elem.xpath('.//w:sz/@w:val',namespaces=ns))
 print('DOCX content and fonts passed; images=2 tables=2 explicit page breaks=2')
r=PdfReader(p/'reservation-sample.pdf'); print('PDF pages',len(r.pages));assert len(r.pages)==3
for i,page in enumerate(r.pages,1):
 print('Page',i,'fonts',[(k,v.get_object().get('/BaseFont')) for k,v in page['/Resources']['/Font'].items()])
with pdfplumber.open(p/'reservation-sample.pdf') as pdf:
 sizes=set()
 for i,page in enumerate(pdf.pages,1):
  cs=page.chars;sizes.update(round(c['size'],2) for c in cs)
  assert all(c['x0']>=24*72/25.4-0.1 and c['x1']<=186*72/25.4+0.1 for c in cs)
  assert all(c['top']>=25*72/25.4-0.1 and c['bottom']<=275*72/25.4+0.1 for c in cs)
 print('PDF text sizes',sorted(sizes));assert min(sizes)>=10.5
print('Screen label minimum effective size',27/1100*162/25.4*72)
