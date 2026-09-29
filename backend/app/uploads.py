from pypdf.generic import IndirectObject, DictionaryObject, ArrayObject

def reject_active_pdf(pdf):
    """Inspect resolved objects, including escaped names and compressed objects."""
    seen = set()
    blocked = {'/JS', '/JavaScript', '/Launch', '/EmbeddedFiles', '/OpenAction', '/AA', '/RichMedia', '/XFA'}
    stack = [pdf.trailer]
    inspected = 0
    while stack:
        obj = stack.pop()
        if isinstance(obj, IndirectObject):
            key = (obj.idnum, obj.generation)
            if key in seen:
                continue
            seen.add(key)
            obj = obj.get_object()
        inspected += 1
        if inspected > 100000:
            raise ValueError('PDF excessivamente complexo')
        if isinstance(obj, DictionaryObject):
            if blocked.intersection(str(k) for k in obj.keys()):
                raise ValueError('Conteúdo ativo não permitido')
            if str(obj.get('/S')) in {'/JavaScript','/Launch','/SubmitForm','/ImportData','/GoToR','/URI'}:
                raise ValueError('Ação externa não permitida')
            stack.extend(obj.values())
        elif isinstance(obj, ArrayObject):
            stack.extend(obj)
