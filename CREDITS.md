# CREDITS.md

## Portions of this software use, depend, or was inspired by the work of:

## "Fortune's algorithm" by Steven J. Fortune

For his clever algorithm to compute Voronoi diagrams.

http://ect.bell-labs.com/who/sjf/

## "The Liang-Barsky line clipping algorithm in a nutshell!" by Daniel White

To efficiently clip a line within a rectangle.

http://www.skytopia.com/project/articles/compsci/clipping.html

## "rbtree" by Franck Bui-Huu

For his RB-tree C implmentation.

I ported to Javascript the C code of a Red-Black tree implementation by
Franck Bui-Huu, and further altered the code for Javascript efficiency
and to very specifically fit the purpose of holding the beachline (the key
is a variable range rather than an unmutable data point), and unused
code paths have been removed.

Each node in the tree is actually a beach section on the beachline. Using a
tree structure for the beachline remove the need to lookup the beach section
in the array at removal time, as now a circle event can safely hold a
reference to its associated beach section (thus findDeletionPoint() is no
longer needed).

This finally take care of nagging finite arithmetic precision issues arising
at lookup time, such that epsilon could be brought down to 1e-9 (from 1e-4).
rhill 2011-05-27: added a 'previous' and 'next' members which keeps track
of previous and next nodes, and remove the need for Beachsection.getPrevious()
and Beachsection.getNext().

https://github.com/fbuihuu/libtree/blob/master/rb.c

