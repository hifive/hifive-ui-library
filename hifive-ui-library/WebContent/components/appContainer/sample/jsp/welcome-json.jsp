<%@ page language="java" contentType="application/json; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	String name = request.getParameter("name");
	out.println("{\"message\":\"ようこそ 『" + name + "』 さん\"}");
%>