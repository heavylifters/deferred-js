VOWS=vows/{Deferred,DeferredList}.js

spec:
	vows --spec $(VOWS)

test:
	vows $(VOWS)
