# CHANGELOG.md

## 0.99 (22 Apr 2013):

Now returning all the unique vertices linking all the edges. This addresses
issue #4: https://github.com/gorhill/Javascript-Voronoi/issues/4

## 0.98 (25 Jan 2013):

Added Cell.getBbox() and Cell.pointIntersection() for convenience when using
an external treemap.

## 0.97 (21 Jan 2013):

Merged contribution by Jesse Morgan (https://github.com/morgajel):
Cell.getNeighbourIds()
https://github.com/gorhill/Javascript-Voronoi/commit/4c50f691a301cd6a286359fefba1fab30c8e3b89

## 0.96 (26 May 2011):

Returned diagram.cells is now an array, whereas the index of a cell
matches the index of its associated site in the array of sites passed
to Voronoi.compute(). This allowed some gain in performance. The
'voronoiId' member is still used internally by the Voronoi object.
The Voronoi.Cells object is no longer necessary and has been removed.

## 0.95 (19 May 2011):

No longer using Javascript array to keep track of the beach sections of
the beachline, now using Red-Black tree.

The move to a binary tree was unavoidable, as I ran into finite precision
arithmetic problems when I started to use sites with fractional values.

The problem arose when the code had to find the arc associated with a
triggered Fortune circle event: the collapsing arc was not always properly
found due to finite precision arithmetic-related errors. Using a tree structure
eliminate the need to look-up a beachsection in the array structure
(findDeletionPoint()), and allowed to bring back epsilon down to 1e-9.

## 0.91(21 September 2010):

Lower epsilon from 1e-5 to 1e-4, to fix problem reported at
http://www.raymondhill.net/blog/?p=9#comment-1414

## 0.90 (21 September 2010):

First version.

