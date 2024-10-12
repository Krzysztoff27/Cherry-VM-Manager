<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:param name="new-uuid"/>
  <xsl:param name="new-name"/>
  <xsl:param name="new-disk-image"/>

  <!-- Copy the whole document -->
  <xsl:template match="/">
    <xsl:apply-templates/>
  </xsl:template>

  <!-- Match and modify the <uuid> element -->
  <xsl:template match="uuid">
    <uuid>
      <xsl:value-of select="$new-uuid"/>
    </uuid>
  </xsl:template>

  <!-- Match and modify the <name> element -->
  <xsl:template match="name">
    <name>
      <xsl:value-of select="$new-name"/>
    </name>
  </xsl:template>

  <!-- Match and modify the <source> element inside the first <disk> -->
  <xsl:template match="devices/disk[@device='disk']/source">
    <source file="{ $new-disk-image }"/>
  </xsl:template>

  <!-- Identity transform for all other elements -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
